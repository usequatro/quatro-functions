import * as functions from 'firebase-functions';
import { google } from 'googleapis';

import formatISO from 'date-fns/formatISO';
import cond from 'lodash/cond';

import REGION from '../../constants/region';
import { update as updateTask } from '../../repositories/tasks';
import { Task } from '../../schemas/task';
import { getCalendarById, updateCalendar } from '../../repositories/calendars';
import createGoogleApisAuth from '../../utils/createGoogleApisAuth';
import { CalendarProviders } from '../../constants/calendarProviders';

const { hostname } = functions.config().app || {};

type TaskWrapper = { id: string; data: Task };

const areCalendarEventFieldsDifferent = (taskA: Task, taskB: Task) =>
  Boolean(
    taskA.title !== taskB.title ||
      taskA.description !== taskB.description ||
      taskA.calendarBlockStart !== taskB.calendarBlockStart ||
      taskA.calendarBlockEnd !== taskB.calendarBlockEnd,
  );

const taskHasCalendarBlock = (task: Task) =>
  Boolean(task.calendarBlockStart && task.calendarBlockEnd);

const getProviderCalendarIdFromFirestoreCalendarId = async (calendarId: string) => {
  const [, calendarEntity] = (await getCalendarById(calendarId)) || [];
  return calendarEntity?.providerCalendarId;
};

const updateCalendarWatcherTime = (calendarId: string, userId: string) =>
  updateCalendar(calendarId, { watcherLastUpdated: Date.now() }).catch((error) => {
    functions.logger.error('Error updating calendar watcherLastUpdated', {
      calendarId,
      userId,
      errorCode: error.code,
      errorMessage: error.message,
    });
  });

const buildExtendedProperties = (taskId: string) => ({
  private: {
    taskId,
  },
});

enum CreationReason {
  TaskJustCreated = 'taskJustCreated',
  CalendarBlockJustSet = 'calendarBlockJustSet',
  AfterMarkedIncomplete = 'afterMarkedIncomplete',
}

const processEventCreation = async (userId: string, after: TaskWrapper, reason: CreationReason) => {
  const calendarId = after.data.calendarBlockCalendarId;
  if (!calendarId) {
    throw new Error(`No after.data.calendarBlockCalendarId in task ${after.id}`);
  }

  const calendarPair = await getCalendarById(calendarId);

  if (!calendarPair) {
    // If the calendar doesn't exist anymore, that's ok. Let's remove the timebox and finish
    if (reason === CreationReason.AfterMarkedIncomplete) {
      await updateTask(after.id, {
        calendarBlockStart: null,
        calendarBlockEnd: null,
        calendarBlockCalendarId: null,
        calendarBlockProviderCalendarId: null,
        calendarBlockProvider: null,
        calendarBlockProviderEventId: null,
      });
      return;
      // Otherwise, it's an undesirable situation
    } else {
      functions.logger.error('No calendar found when trying to create event for task', {
        reason,
        userId,
        calendarId,
        taskId: after.id,
      });
      throw new Error('No calendar found when trying to create event for task');
    }
  }

  const providerCalendarId = calendarPair[1].providerCalendarId;
  if (!providerCalendarId) {
    throw new Error(`No providerCalendarId in calendar ${calendarPair[0]}, for task ${after.id}`);
  }

  // Check if task has a time block, and create event for it if so
  const auth = await createGoogleApisAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // @link https://developers.google.com/calendar/v3/reference/events/insert
  return calendar.events
    .insert({
      calendarId: providerCalendarId,
      requestBody: {
        summary: after.data.title,
        description: after.data.description,
        start: {
          dateTime: formatISO(after.data.calendarBlockStart || 0),
        },
        end: {
          dateTime: formatISO(after.data.calendarBlockEnd || 0),
        },
        source: {
          title: 'Quatro',
          url: `https://${hostname}/task/${after.id}`,
        },
        // @link https://developers.google.com/calendar/extended-properties
        extendedProperties: buildExtendedProperties(after.id),
        status: 'confirmed',
        transparency: 'opaque',
        visibility: 'private',
      },
    })
    .then(async (response) => {
      const eventId = response.data.id;
      await updateTask(after.id, {
        calendarBlockProvider: CalendarProviders.Google,
        calendarBlockProviderCalendarId: providerCalendarId,
        calendarBlockProviderEventId: eventId,
      });

      // Update watcher time so client refreshes the events list
      await updateCalendarWatcherTime(calendarId, userId);

      functions.logger.info('Processed Google Calendar event creation', {
        reason,
        googleCalendarEventId: eventId,
        userId,
        taskId: after.id,
      });
    })
    .catch((error) => {
      functions.logger.error('Error response from events.insert', {
        reason,
        providerCalendarId,
        userId,
        taskId: after.id,
        errorMessage: error.message,
        errors: error.errors,
      });
      throw error;
    });
};

enum DeletionReason {
  TaskDeleted = 'taskDeleted',
  CalendarBlockNotSet = 'calendarBlockNotSet',
  TaskCompleted = 'taskCompleted',
}

const processEventDeletion = async (
  userId: string,
  before: TaskWrapper,
  after: TaskWrapper | null,
  reason: DeletionReason,
) => {
  const calendarId = before.data.calendarBlockCalendarId;
  if (!calendarId) {
    throw new Error(`No before.data.calendarBlockCalendarId in task ${before.id}`);
  }
  const providerEventId = before.data.calendarBlockProviderEventId;
  if (!providerEventId) {
    throw new Error(`No before.data.calendarBlockProviderEventId in task ${before.id}`);
  }

  let providerCalendarId = before.data.calendarBlockProviderCalendarId;
  if (!providerCalendarId) {
    // @todo: remove this fallback searching the calendar document after a while
    providerCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(calendarId);
    if (!providerCalendarId) {
      throw new Error(`No before.data.calendarBlockProviderCalendarId in task ${before.id}`);
    }
    functions.logger.info('Had to use calendarBlockCalendarId fallback', {
      userId,
      taskId: before.id,
      calendarBlockCalendarId: before.data.calendarBlockCalendarId,
    });
  }

  // Check if task has a time block, and create event for it if so
  const auth = await createGoogleApisAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // @link https://developers.google.com/calendar/v3/reference/events/delete
  return calendar.events
    .delete({
      eventId: providerEventId,
      calendarId: providerCalendarId,
    })
    .then(async () => {
      // If task still exists, clear values for being connected to a Google Calendar event
      if (
        after &&
        (after.data.calendarBlockProviderEventId ||
          after.data.calendarBlockProviderCalendarId ||
          after.data.calendarBlockProvider)
      ) {
        await updateTask(after.id, {
          calendarBlockProviderEventId: null,

          // we could nullify these in case the task was completed, but we don't need to
          // let's keep them to re-create the event if the task is mark incomplete later
          // calendarBlockEnd: null,
          // calendarBlockStart: null,
          // calendarBlockCalendarId: null,
          // calendarBlockProviderCalendarId: null,
          // calendarBlockProvider: null,
        });

        // Update watcher time so client refreshes the events list
        await updateCalendarWatcherTime(calendarId, userId);
      }
      functions.logger.info('Processed Google Calendar event deletion', {
        reason,
        googleCalendarEventId: providerEventId,
        userId,
        taskId: before.id,
      });
    })
    .catch((error) => {
      // If the event was actually already deleted, all good, nothing to complain about, dude
      if (error.errors && error.errors[0]?.reason === 'deleted') {
        return;
      }
      functions.logger.error('Error response from events.delete', {
        reason,
        providerCalendarId,
        googleCalendarEventId: providerEventId,
        userId,
        taskId: before.id,
        errorMessage: error.message,
        errors: error.errors,
      });
      throw error;
    });
};

const processEventPatch = async (userId: string, after: TaskWrapper) => {
  const calendarId = after.data.calendarBlockCalendarId;
  if (!calendarId) {
    throw new Error(`No after.data.calendarBlockCalendarId in task ${after.id}`);
  }
  if (!after.data.calendarBlockProviderEventId) {
    throw new Error(`No after.data.calendarBlockProviderEventId in task ${after.id}`);
  }

  let providerCalendarId = after.data.calendarBlockProviderCalendarId;
  if (!providerCalendarId) {
    // @todo: remove this fallback searching the calendar document after a while
    providerCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(calendarId);
    if (!providerCalendarId) {
      throw new Error(`No after.data.calendarBlockProviderCalendarId in task ${after.id}`);
    }
    functions.logger.info('Had to use calendarBlockCalendarId fallback', {
      userId,
      taskId: after.id,
      calendarBlockCalendarId: after.data.calendarBlockCalendarId,
    });
  }

  // Check if task has a time block, and create event for it if so
  const auth = await createGoogleApisAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // @link https://developers.google.com/calendar/v3/reference/events/patch
  return calendar.events
    .patch({
      eventId: after.data.calendarBlockProviderEventId,
      calendarId: providerCalendarId,
      requestBody: {
        summary: after.data.title,
        description: after.data.description,
        start: {
          dateTime: formatISO(after.data.calendarBlockStart || 0),
        },
        end: {
          dateTime: formatISO(after.data.calendarBlockEnd || 0),
        },
        status: 'confirmed',
        extendedProperties: buildExtendedProperties(after.id),
      },
    })
    .then(async () => {
      // Update watcher time so client refreshes the events list
      await updateCalendarWatcherTime(calendarId, userId);

      functions.logger.info('Processed Google Calendar event patching', {
        googleCalendarEventId: after.data.calendarBlockProviderEventId,
        userId,
        taskId: after.id,
      });
    })
    .catch((error) => {
      functions.logger.error('Error response from events.patch', {
        providerCalendarId,
        googleCalendarEventId: after.data.calendarBlockProviderEventId,
        userId,
        taskId: after.id,
        errorMessage: error.message,
        errors: error.errors,
      });
      throw error;
    });
};

const processEventMove = async (userId: string, before: TaskWrapper, after: TaskWrapper) => {
  if (!before.data.calendarBlockCalendarId) {
    throw new Error(`No before.data.calendarBlockCalendarId in task ${before.id}`);
  }
  if (!before.data.calendarBlockProviderEventId) {
    throw new Error(`No before.data.calendarBlockProviderEventId in task ${before.id}`);
  }
  if (!after.data.calendarBlockCalendarId) {
    throw new Error(`No after.data.calendarBlockCalendarId in task ${after.id}`);
  }

  let beforeProviderCalendarId = before.data.calendarBlockProviderCalendarId;
  if (!beforeProviderCalendarId) {
    // @todo: remove this fallback searching the calendar document after a while
    beforeProviderCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(
      before.data.calendarBlockCalendarId,
    );
    if (!beforeProviderCalendarId) {
      throw new Error(`No before.data.calendarBlockProviderCalendarId in task ${before.id}`);
    }
    functions.logger.info('Had to use calendarBlockCalendarId fallback', {
      userId,
      taskId: before.id,
      calendarBlockCalendarId: before.data.calendarBlockCalendarId,
    });
  }

  // We expect calendarBlockProviderCalendarId to be changed by the client producing this effect
  let afterProviderCalendarId = after.data.calendarBlockProviderCalendarId;
  if (!afterProviderCalendarId) {
    // @todo: remove this fallback searching the calendar document after a while
    afterProviderCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(
      after.data.calendarBlockCalendarId,
    );
    if (!afterProviderCalendarId) {
      throw new Error(`No after.data.calendarBlockProviderCalendarId in task ${after.id}`);
    }
    functions.logger.info('Had to use calendarBlockCalendarId fallback', {
      userId,
      taskId: after.id,
      calendarBlockCalendarId: after.data.calendarBlockCalendarId,
    });
  }

  // Check if task has a time block, and create event for it if so
  const auth = await createGoogleApisAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // @link https://developers.google.com/calendar/v3/reference/events/move
  return calendar.events
    .move({
      calendarId: beforeProviderCalendarId,
      destination: afterProviderCalendarId,
      eventId: before.data.calendarBlockProviderEventId,
    })
    .then(async () => {
      functions.logger.info('Processed Google Calendar event moving', {
        googleCalendarEventId: after.data.calendarBlockProviderEventId,
        beforeProviderCalendarId,
        afterProviderCalendarId,
        userId,
        taskId: after.id,
      });
    })
    .catch((error) => {
      functions.logger.error('Error response from events.move', {
        beforeProviderCalendarId,
        afterProviderCalendarId,
        googleCalendarEventId: before.data.calendarBlockProviderEventId,
        userId,
        taskId: after.id,
        errorMessage: error.message,
        errors: error.errors,
      });
      throw error;
    });
};

export default functions
  .region(REGION)
  .firestore.document('tasks/{taskId}')
  // https://firebase.google.com/docs/functions/firestore-events
  .onWrite(async (change /*, context */) => {
    const before: TaskWrapper | null = change.before.exists
      ? { id: change.before.id, data: change.before.data() as Task }
      : null;
    const after: TaskWrapper | null = change.after.exists
      ? { id: change.after.id, data: change.after.data() as Task }
      : null;

    const userId = after?.data.userId || before?.data.userId;

    if (!userId) {
      throw new Error(
        `No user ID found in either
          before task ${before?.id || '-'} or
          after task ${after?.id || '-'}`,
      );
    }

    // functions.logger.info('Debug after and before', { after, before });

    // Deletion
    if (before && before.data.calendarBlockCalendarId && before.data.calendarBlockProviderEventId) {
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      const reason: DeletionReason | undefined = cond([
        [() => !after, () => DeletionReason.TaskDeleted],
        [() => !taskHasCalendarBlock(after!.data), () => DeletionReason.CalendarBlockNotSet],
        [
          () => Boolean(!before.data.completed && after!.data.completed),
          () => DeletionReason.TaskCompleted,
        ],
      ])(undefined);
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
      if (reason) {
        return processEventDeletion(userId, before, after, reason);
      }
    }

    // Creation
    if (
      after &&
      after.data.calendarBlockCalendarId &&
      !after.data.calendarBlockProviderEventId &&
      taskHasCalendarBlock(after.data)
    ) {
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      const reason: CreationReason | undefined = cond([
        [() => !before, () => CreationReason.TaskJustCreated],
        [() => !taskHasCalendarBlock(before!.data), () => CreationReason.CalendarBlockJustSet],
        [() => !after.data.completed, () => CreationReason.AfterMarkedIncomplete],
      ])(undefined);
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
      if (reason) {
        return processEventCreation(userId, after, reason);
      }
    }

    // Moving to different calendar
    if (
      after &&
      before &&
      before.data.calendarBlockCalendarId &&
      after.data.calendarBlockCalendarId &&
      before.data.calendarBlockCalendarId !== after.data.calendarBlockCalendarId
    ) {
      return processEventMove(userId, before, after).then(
        // We always patch because with the move we lose the extendedProperties
        () => processEventPatch(userId, after),
      );
    }

    // Made some task changes, but on the same calendar
    if (
      before &&
      taskHasCalendarBlock(before.data) &&
      after &&
      taskHasCalendarBlock(after.data) &&
      before.data.calendarBlockCalendarId === after.data.calendarBlockCalendarId &&
      areCalendarEventFieldsDifferent(before.data, after.data)
    ) {
      return processEventPatch(userId, after);
    }

    return undefined;
  });
