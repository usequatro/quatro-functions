import * as functions from 'firebase-functions';
import { google } from 'googleapis';

import isBefore from 'date-fns/isBefore';
import formatISO from 'date-fns/formatISO';
import startOfMinute from 'date-fns/startOfMinute';
import cond from 'lodash/cond';

import REGION from '../constants/region';
import { update as updateTask } from '../repositories/tasks';
import { Task } from '../types/task';
import createGoogleApisAuth from '../utils/createGoogleApisAuth';
import { CalendarProvider } from '../types/index';

const { hostname } = functions.config().app || {};

type TaskFieldsForCalendarEvent = {
  title: string;
  description: string;
  calendarBlockStart: number;
  calendarBlockEnd: number;
  completed: number | null;
  taskId: string;
};

const createCalendarEvent = async (
  userId: string,
  providerCalendarId: string,
  fields: TaskFieldsForCalendarEvent,
) => {
  const auth = await createGoogleApisAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const { title, description, calendarBlockStart, calendarBlockEnd, taskId, completed } = fields;

  // @link https://developers.google.com/calendar/v3/reference/events/insert
  return calendar.events
    .insert({
      calendarId: providerCalendarId,
      requestBody: {
        summary: title,
        description: description,
        start: {
          dateTime: formatISO(calendarBlockStart),
        },
        end: {
          dateTime: formatISO(calendarBlockEnd),
        },
        source: {
          title: 'Quatro',
          url: `https://${hostname}/task/${taskId}`,
        },
        // @link https://developers.google.com/calendar/extended-properties
        extendedProperties: {
          private: {
            taskId,
            completed: `${completed || 0}`,
          },
        },
        status: 'confirmed',
        transparency: 'opaque',
        visibility: 'private',
      },
    })
    .then(async (response) => {
      const eventId = response.data.id;
      functions.logger.info(`Created event ${eventId} in calendar ${providerCalendarId}`, {
        userId,
        taskId,
        fields,
      });
      return response;
    })
    .catch((error) => {
      functions.logger.error(new Error('Error response from events.insert'), {
        providerCalendarId,
        userId,
        taskId,
        errorMessage: error.message,
        errors: error.errors,
      });
      throw error;
    });
};

const updateTaskCalendarEvent = (
  taskId: string,
  providerCalendarId: string,
  providerCalendarEventId: string,
) =>
  updateTask(taskId, {
    calendarBlockProvider: CalendarProvider.Google,
    calendarBlockProviderCalendarId: providerCalendarId,
    calendarBlockProviderEventId: providerCalendarEventId,
  }).catch((error) => {
    // the update could fail because the task no longer exists. Fine if so.
    functions.logger.warn('Error updating task after event creation', {
      providerCalendarId,
      taskId,
      error,
    });
  });

const deleteCalendarEvent = async (
  userId: string,
  providerCalendarId: string,
  providerEventId: string,
) => {
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
      functions.logger.info(`Deleted event ${providerEventId} of calendar ${providerCalendarId}`, {
        userId,
      });
    })
    .catch((error) => {
      // If the event was actually already deleted, all good, nothing to complain about, dude
      if (error.errors && error.errors[0]?.reason === 'deleted') {
        return;
      }
      functions.logger.error(new Error('Error response from events.delete'), {
        userId,
        providerCalendarId,
        providerEventId,
        errorMessage: error.message,
        errors: error.errors,
      });
      throw error;
    });
};

const patchCalendarEvent = async (
  userId: string,
  providerCalendarId: string,
  providerEventId: string,
  updates: Partial<TaskFieldsForCalendarEvent>,
) => {
  // Check if task has a time block, and create event for it if so
  const auth = await createGoogleApisAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const { title, description, calendarBlockStart, calendarBlockEnd, taskId, completed } = updates;

  // @link https://developers.google.com/calendar/v3/reference/events/patch
  return calendar.events
    .patch({
      eventId: providerEventId,
      calendarId: providerCalendarId,
      requestBody: {
        ...(title !== undefined ? { summary: title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(calendarBlockStart !== undefined
          ? {
              start: {
                dateTime: formatISO(calendarBlockStart),
              },
            }
          : {}),
        ...(calendarBlockEnd !== undefined
          ? {
              end: {
                dateTime: formatISO(calendarBlockEnd),
              },
            }
          : {}),
        status: 'confirmed',
        // @link https://developers.google.com/calendar/extended-properties
        extendedProperties: {
          private: {
            ...(taskId !== undefined ? { taskId } : {}),
            ...(completed !== undefined ? { completed: `${completed || 0}` } : {}),
          },
        },
      },
    })
    .then(async () => {
      functions.logger.info(`Patched event ${providerEventId} of calendar ${providerCalendarId}`, {
        userId,
        taskId,
        updates,
      });
    })
    .catch((error) => {
      functions.logger.error(new Error('Error response from events.patch'), {
        providerCalendarId,
        providerEventId,
        userId,
        taskId: taskId,
        errorMessage: error.message,
        errors: error.errors,
      });
      throw error;
    });
};

const moveCalendarEvent = async (
  userId: string,
  currentProviderCalendarId: string,
  nextProviderCalendarId: string,
  providerEventId: string,
) => {
  // Check if task has a time block, and create event for it if so
  const auth = await createGoogleApisAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // @link https://developers.google.com/calendar/v3/reference/events/move
  return calendar.events
    .move({
      calendarId: currentProviderCalendarId,
      destination: nextProviderCalendarId,
      eventId: providerEventId,
    })
    .then(async (response) => {
      functions.logger.info(
        `Moved event ${providerEventId} from ${currentProviderCalendarId} to ${nextProviderCalendarId}`,
        {
          userId,
        },
      );
      return response;
    })
    .catch((error) => {
      functions.logger.error(new Error('Error response from events.move'), {
        providerEventId: providerEventId,
        lastProviderCalendarId: currentProviderCalendarId,
        nextProviderCalendarId,
        userId,
        errorMessage: error.message,
        errors: error.errors,
      });
      throw error;
    });
};

const wasTaskWithEventCompleted = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  const taskRemainsExisting = change.before.exists && change.after.exists;
  if (!taskRemainsExisting) {
    return false;
  }
  const beforeData = change.before.data() as Task;
  const afterData = change.after.data() as Task;
  const taskWasJustCompleted = Boolean(!beforeData.completed && afterData.completed);
  const taskHasEvent = Boolean(afterData.calendarBlockProviderEventId);
  const taskHasCalendar = Boolean(afterData.calendarBlockProviderCalendarId);
  return Boolean(taskWasJustCompleted && taskHasCalendar && taskHasEvent);
};

const wasTaskDeletedWithCalendarEvent = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  const taskWasJustDeleted = change.before.exists && !change.after.exists;
  if (!taskWasJustDeleted) {
    return false;
  }
  const beforeData = change.before.data() as Task;
  const taskHadEvent = Boolean(beforeData.calendarBlockProviderEventId);
  return taskHadEvent;
};

const wasTaskCalendarBlockRemoved = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  const taskRemainsExisting = change.before.exists && change.after.exists;
  if (!taskRemainsExisting) {
    return false;
  }
  const beforeData = change.before.data() as Task;
  const afterData = change.after.data() as Task;
  const beforeHadCalendarBlock = Boolean(
    beforeData.calendarBlockStart && beforeData.calendarBlockEnd,
  );
  const afterHasCalendarBlock = Boolean(afterData.calendarBlockStart && afterData.calendarBlockEnd);

  return Boolean(beforeHadCalendarBlock && !afterHasCalendarBlock);
};

const wasTaskJustCreatedWithCalendarBlock = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  const taskJustCreated = !change.before.exists && change.after.exists;
  if (!taskJustCreated) {
    return false;
  }
  const afterData = change.after.data() as Task;
  const alreadyHasEvent = Boolean(afterData.calendarBlockProviderEventId);
  if (alreadyHasEvent) {
    return false;
  }
  const taskHasCalendarBlock = Boolean(afterData.calendarBlockStart && afterData.calendarBlockEnd);
  const taskHasCalendar = Boolean(afterData.calendarBlockProviderCalendarId);
  return Boolean(taskHasCalendar && taskHasCalendarBlock);
};

const wasCalendarBlockJustDefined = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  const taskRemainsExisting = change.before.exists && change.after.exists;
  if (!taskRemainsExisting) {
    return false;
  }
  const afterData = change.after.data() as Task;
  const alreadyHasEvent = Boolean(afterData.calendarBlockProviderEventId);
  if (alreadyHasEvent) {
    return false;
  }
  const taskHasCalendarBlock = Boolean(afterData.calendarBlockStart && afterData.calendarBlockEnd);
  const taskHasCalendarEvent = Boolean(afterData.calendarBlockProviderEventId);
  const taskHasCalendar = Boolean(afterData.calendarBlockProviderCalendarId);
  return !taskHasCalendarEvent && taskHasCalendarBlock && taskHasCalendar;
};

const wasTaskWithCalendarBlockJustMarkedIncomplete = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  const taskRemainsExisting = change.before.exists && change.after.exists;
  if (!taskRemainsExisting) {
    return false;
  }
  const beforeData = change.before.data() as Task;
  const afterData = change.after.data() as Task;
  const taskWasMarkedIncomplete = Boolean(beforeData.completed && !afterData.completed);
  const taskHasCalendarBlock = Boolean(afterData.calendarBlockStart && afterData.calendarBlockEnd);

  return taskWasMarkedIncomplete && taskHasCalendarBlock;
};

const hasTaskAssociatedCalendarBlockEventId = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  return change.after.data()?.calendarBlockProviderEventId;
};

const wasTaskMovedBetweenCalendars = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  const taskRemainsExisting = change.before.exists && change.after.exists;
  if (!taskRemainsExisting) {
    return false;
  }
  const beforeData = change.before.data() as Task;
  const afterData = change.after.data() as Task;
  const calendarsAreTheSame =
    beforeData.calendarBlockProviderCalendarId === afterData.calendarBlockProviderCalendarId;
  const taskHasCalendarBlock = Boolean(afterData.calendarBlockStart && afterData.calendarBlockEnd);
  const taskHadEvent = Boolean(beforeData.calendarBlockProviderEventId);
  return taskHadEvent && taskHasCalendarBlock && !calendarsAreTheSame;
};

const wereTaskDetailsModifiedInSameCalendar = (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
): boolean => {
  const taskRemainsExisting = change.before.exists && change.after.exists;
  if (!taskRemainsExisting) {
    return false;
  }
  const beforeData = change.before.data() as Task;
  const afterData = change.after.data() as Task;
  const taskHasCalendarBlock = Boolean(afterData.calendarBlockStart && afterData.calendarBlockEnd);
  const taskHadCalendarBlock = Boolean(
    beforeData.calendarBlockStart && beforeData.calendarBlockEnd,
  );
  const calendarsAreTheSame =
    beforeData.calendarBlockProviderCalendarId === afterData.calendarBlockProviderCalendarId;
  const hasChanges = Boolean(
    beforeData.title !== afterData.title ||
      beforeData.description !== afterData.description ||
      beforeData.calendarBlockStart !== afterData.calendarBlockStart ||
      beforeData.calendarBlockEnd !== afterData.calendarBlockEnd,
  );
  return taskHasCalendarBlock && taskHadCalendarBlock && calendarsAreTheSame && hasChanges;
};

export default functions
  .region(REGION)
  .firestore.document('tasks/{taskId}')
  // https://firebase.google.com/docs/functions/firestore-events
  .onWrite((change /*, context */) => {
    return cond([
      [
        wasTaskDeletedWithCalendarEvent,
        () => {
          functions.logger.info('Processing wasTaskDeletedWithCalendarEvent');
          const beforeTask = change.before.data() as Task;
          return deleteCalendarEvent(
            beforeTask.userId,
            beforeTask.calendarBlockProviderCalendarId as string,
            beforeTask.calendarBlockProviderEventId as string,
          );
        },
      ],
      [
        wasTaskCalendarBlockRemoved,
        () => {
          functions.logger.info('Processing wasTaskCalendarBlockRemoved');
          const beforeTask = change.before.data() as Task;
          return deleteCalendarEvent(
            beforeTask.userId,
            beforeTask.calendarBlockProviderCalendarId as string,
            beforeTask.calendarBlockProviderEventId as string,
          ).then(async () => {
            // If task still exists, clear values for being connected to a Google Calendar event
            if (change.after.exists) {
              await updateTask(change.after.id, {
                calendarBlockProviderEventId: null,
              });
            }
          });
        },
      ],
      [
        wasTaskWithEventCompleted,
        () => {
          const afterTask = change.after.data() as Task;
          const completionTimestamp = afterTask.completed as number;

          const eventTimesAreUnknown = !afterTask.calendarBlockStart || !afterTask.calendarBlockEnd;
          const eventIsUpcoming =
            afterTask.calendarBlockStart &&
            isBefore(completionTimestamp, afterTask.calendarBlockStart);
          const eventIsOngoing =
            afterTask.calendarBlockStart &&
            afterTask.calendarBlockEnd &&
            isBefore(afterTask.calendarBlockStart, completionTimestamp) &&
            isBefore(completionTimestamp, afterTask.calendarBlockEnd);
          const eventIsPast = !eventTimesAreUnknown && !eventIsOngoing && !eventIsUpcoming;

          functions.logger.info('Processing wasTaskWithEventCompleted', {
            eventTimesAreUnknown,
            eventIsUpcoming,
            eventIsOngoing,
            eventIsPast,
            completionTimestamp,
          });

          if (eventTimesAreUnknown || eventIsUpcoming) {
            return deleteCalendarEvent(
              afterTask.userId,
              afterTask.calendarBlockProviderCalendarId as string,
              afterTask.calendarBlockProviderEventId as string,
            );
          } else if (eventIsOngoing) {
            return patchCalendarEvent(
              afterTask.userId,
              afterTask.calendarBlockProviderCalendarId as string,
              afterTask.calendarBlockProviderEventId as string,
              {
                calendarBlockEnd: startOfMinute(completionTimestamp).getTime(),
                completed: completionTimestamp,
              },
            );
          } else if (eventIsPast) {
            return patchCalendarEvent(
              afterTask.userId,
              afterTask.calendarBlockProviderCalendarId as string,
              afterTask.calendarBlockProviderEventId as string,
              { completed: completionTimestamp },
            );
          }
          return Promise.resolve();
        },
      ],
      [
        (c) =>
          wasTaskWithCalendarBlockJustMarkedIncomplete(c) &&
          hasTaskAssociatedCalendarBlockEventId(c),
        () => {
          functions.logger.info(
            'Processing wasTaskWithCalendarBlockJustMarkedIncomplete && hasTaskAssociatedCalendarBlockEventId',
          );
          const afterTask = change.after.data() as Task;
          const calendarBlockStart = afterTask.calendarBlockStart as number;
          const calendarBlockEnd = afterTask.calendarBlockEnd as number;

          const taskOptions = {
            title: afterTask.title,
            description: afterTask.description,
            calendarBlockStart,
            calendarBlockEnd,
            taskId: change.after.id,
            completed: afterTask.completed,
          };
          // We always patch because with the move we lose the extendedProperties
          return patchCalendarEvent(
            afterTask.userId,
            afterTask.calendarBlockProviderCalendarId as string,
            afterTask.calendarBlockProviderEventId as string,
            taskOptions,
          );
        },
      ],
      [
        (c) =>
          wasTaskJustCreatedWithCalendarBlock(c) ||
          wasCalendarBlockJustDefined(c) ||
          (wasTaskWithCalendarBlockJustMarkedIncomplete(c) &&
            !hasTaskAssociatedCalendarBlockEventId(c)),
        () => {
          functions.logger.info('Processing creation');
          const task = change.after.data() as Task;
          const calendarBlockStart = task.calendarBlockStart as number;
          const calendarBlockEnd = task.calendarBlockEnd as number;
          const taskOptions = {
            title: task.title,
            description: task.description,
            calendarBlockStart,
            calendarBlockEnd,
            completed: task.completed,
            taskId: change.after.id,
          };
          return createCalendarEvent(
            task.userId,
            task.calendarBlockProviderCalendarId as string,
            taskOptions,
          ).then((response) => {
            const eventId = response.data.id as string;
            return updateTaskCalendarEvent(
              change.after.id,
              task.calendarBlockProviderCalendarId as string,
              eventId,
            );
          });
        },
      ],
      [
        wasTaskMovedBetweenCalendars,
        () => {
          functions.logger.info('Processing wasTaskMovedBetweenCalendars');
          const beforeTask = change.before.data() as Task;
          const afterTask = change.after.data() as Task;
          const taskId = change.after.id;
          const { userId } = afterTask;

          const newProviderCalendarId = afterTask.calendarBlockProviderCalendarId as string;

          return moveCalendarEvent(
            userId,
            beforeTask.calendarBlockProviderCalendarId as string,
            newProviderCalendarId,
            beforeTask.calendarBlockProviderEventId as string,
          ).then(async (response) => {
            // usually the event ID won't have changed
            const newProviderEventId = response.data.id as string;
            await updateTaskCalendarEvent(taskId, newProviderCalendarId, newProviderEventId);

            const calendarBlockStart = afterTask.calendarBlockStart as number;
            const calendarBlockEnd = afterTask.calendarBlockEnd as number;
            const taskOptions = {
              title: afterTask.title,
              description: afterTask.description,
              calendarBlockStart,
              calendarBlockEnd,
              taskId,
              completed: afterTask.completed,
            };
            // 🚨 We always patch because with the move we lose the extendedProperties
            return patchCalendarEvent(
              userId,
              newProviderCalendarId,
              newProviderEventId,
              taskOptions,
            );
          });
        },
      ],
      [
        wereTaskDetailsModifiedInSameCalendar,
        () => {
          functions.logger.info('Processing wereTaskDetailsModifiedInSameCalendar');
          const afterTask = change.after.data() as Task;

          const taskId = change.after.id;
          const calendarBlockStart = afterTask.calendarBlockStart as number;
          const calendarBlockEnd = afterTask.calendarBlockEnd as number;
          const taskOptions = {
            title: afterTask.title,
            description: afterTask.description,
            calendarBlockStart,
            calendarBlockEnd,
            taskId,
            completed: afterTask.completed,
          };
          // We always patch because with the move we lose the extendedProperties
          return patchCalendarEvent(
            afterTask.userId,
            afterTask.calendarBlockProviderCalendarId as string,
            afterTask.calendarBlockProviderEventId as string,
            taskOptions,
          );
        },
      ],
      [
        () => true,
        () => {
          functions.logger.info('Nothing to do');
          return undefined;
        },
      ],
    ])(change);
  });
