import * as functions from 'firebase-functions';
import { google } from 'googleapis';

import formatISO from 'date-fns/formatISO';

import REGION from '../constants/region';
import { Task } from '../types';
import { update as updateTask } from '../repositories/tasks';
import { getCalendarById } from '../repositories/calendars';
import createGoogleApisAuth from '../utils/createGoogleApisAuth';

type TaskWrapper = { id: string; data: Task };

const log = (prefix: string, message: string) =>
  console.log(`📅 [syncTaskWithGoogleCalendar] ${prefix} - ${message}`);

const areCalendarEventFieldsDifferent = (taskA: Task, taskB: Task) =>
  Boolean(
    taskA.title !== taskB.title ||
      taskA.description !== taskB.description ||
      taskA.completed !== taskB.completed ||
      taskA.calendarBlockStart !== taskB.calendarBlockStart ||
      taskA.calendarBlockEnd !== taskB.calendarBlockEnd,
  );

const taskHasCalendarBlock = (task: Task) =>
  Boolean(task.calendarBlockStart && task.calendarBlockEnd);

const getProviderCalendarIdFromFirestoreCalendarId = async (calendarId: string) => {
  const [, calendarEntity] = (await getCalendarById(calendarId)) || [];
  const providerCalendarId = calendarEntity?.providerCalendarId;
  if (!providerCalendarId) {
    throw new Error(`No calendar provider ID found with calendar id ${calendarId}`);
  }
  return providerCalendarId;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prettyPrintGoogleApiErrorResponse = (error: any) => {
  console.error(
    `Error response. Message="${error.message || ''}" Errors=${JSON.stringify(error.errors || [])}`,
  );
  throw error; // propagate error
};

const processEventCreation = async (userId: string, after: TaskWrapper, prefix: string) => {
  log(prefix, 'Processing event creation');

  if (!after.data.calendarBlockCalendarId) {
    throw new Error(`No after.data.calendarBlockCalendarId - ${prefix}`);
  }

  const providerCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(
    after.data.calendarBlockCalendarId,
  );

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
          url: 'https://usequatro.com', // @TODO: add reliable URL for editing task here
        },
        status: 'confirmed',
        transparency: 'opaque',
        visibility: 'private',
      },
    })
    .then((response) => {
      const eventId = response.data.id;
      return updateTask(after.id, { calendarBlockProviderEventId: eventId });
    }, prettyPrintGoogleApiErrorResponse);
};

const processEventDeletion = async (
  userId: string,
  before: TaskWrapper,
  after: TaskWrapper | null,
  prefix: string,
) => {
  log(prefix, 'Processing event deletion');

  if (!before.data.calendarBlockCalendarId) {
    throw new Error(`No before.data.calendarBlockCalendarId - ${prefix}`);
  }
  if (!before.data.calendarBlockProviderEventId) {
    throw new Error(`No before.data.calendarBlockProviderEventId - ${prefix}`);
  }

  // Check if task had a connected calendar event, and delete it too
  const providerCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(
    before.data.calendarBlockCalendarId,
  );

  // Check if task has a time block, and create event for it if so
  const auth = await createGoogleApisAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // @link https://developers.google.com/calendar/v3/reference/events/delete
  return calendar.events
    .delete({
      eventId: before.data.calendarBlockProviderEventId,
      calendarId: providerCalendarId,
    })
    .then(() => {
      // If task still exists, clear values for being connected to a Google Calendar event
      if (
        after &&
        (after.data.calendarBlockProviderEventId || after.data.calendarBlockCalendarId)
      ) {
        return updateTask(after.id, {
          calendarBlockProviderEventId: null,
          calendarBlockCalendarId: null,
        });
      }
      return undefined;
    }, prettyPrintGoogleApiErrorResponse);
};

const processEventPatch = async (userId: string, after: TaskWrapper, prefix: string) => {
  log(prefix, 'Processing event patch');

  if (!after.data.calendarBlockCalendarId) {
    throw new Error(`No after.data..calendarBlockCalendarId - ${prefix}`);
  }
  if (!after.data.calendarBlockProviderEventId) {
    throw new Error(`No after.data..calendarBlockProviderEventId - ${prefix}`);
  }

  const providerCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(
    after.data.calendarBlockCalendarId,
  );

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
      },
    })
    .catch(prettyPrintGoogleApiErrorResponse);
};

const processEventMove = async (
  userId: string,
  before: TaskWrapper,
  after: TaskWrapper,
  prefix: string,
) => {
  log(prefix, 'Processing event calendar moving');

  if (!before.data.calendarBlockCalendarId) {
    throw new Error(`No before.data.calendarBlockCalendarId - ${prefix}`);
  }
  if (!before.data.calendarBlockProviderEventId) {
    throw new Error(`No before.data.calendarBlockProviderEventId - ${prefix}`);
  }
  if (!after.data.calendarBlockCalendarId) {
    throw new Error(`No after.data.calendarBlockCalendarId - ${prefix}`);
  }

  const beforeProviderCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(
    before.data.calendarBlockCalendarId,
  );
  const afterProviderCalendarId = await getProviderCalendarIdFromFirestoreCalendarId(
    after.data.calendarBlockCalendarId,
  );

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
    .then(() => prettyPrintGoogleApiErrorResponse);
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
    const prefix = `before=${before?.id || '-'} after=${after?.id || '-'} userId=${userId || '-'}`;

    if (!userId) {
      throw new Error(`No user ID found in either after or before task - ${prefix}`);
    }

    // Deletion
    if (
      before &&
      before.data.calendarBlockCalendarId &&
      before.data.calendarBlockProviderEventId &&
      (!after || !taskHasCalendarBlock(after.data))
    ) {
      return processEventDeletion(userId, before, after, prefix);
    }

    // Creation
    if (
      (!before || !taskHasCalendarBlock(before.data)) &&
      after &&
      after.data.calendarBlockCalendarId &&
      taskHasCalendarBlock(after.data)
    ) {
      return processEventCreation(userId, after, prefix);
    }

    // Moving to different calendar
    if (
      after &&
      before &&
      before.data.calendarBlockCalendarId &&
      after.data.calendarBlockCalendarId &&
      before.data.calendarBlockCalendarId !== after.data.calendarBlockCalendarId
    ) {
      return processEventMove(userId, before, after, prefix).then(() => {
        // Then check if there are other changes, if so we need to change it as well
        if (areCalendarEventFieldsDifferent(before.data, after.data)) {
          return processEventPatch(userId, after, prefix);
        }
        return undefined;
      });
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
      return processEventPatch(userId, after, prefix);
    }

    log(prefix, 'Skipping, nothing to do');
    return undefined;
  });
