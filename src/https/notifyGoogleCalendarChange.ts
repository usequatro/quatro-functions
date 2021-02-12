import * as functions from 'firebase-functions';
import cors from 'cors';
import { google } from 'googleapis';
import sub from 'date-fns/sub';
import formatISO from 'date-fns/formatISO';

import REGION from '../constants/region';
import { findCalendarByWatcher, updateCalendar } from '../repositories/calendars';
import createGoogleApisAuth from '../utils/createGoogleApisAuth';
import parseGoogleCalendarDate from '../utils/parseGoogleCalendarDate';
import { findById, update } from '../repositories/tasks';
import { CalendarProviders } from '../constants/calendarProviders';

// Enable cors requests
cors({ origin: true });

/**
 * @link https://developers.google.com/calendar/v3/push
 */
export default functions.region(REGION).https.onRequest(async (request, response) => {
  const channelId = request.headers['x-goog-channel-id'] as string | undefined;
  const resourceId = request.headers['x-goog-resource-id'] as string | undefined;
  const resourceState = request.headers['x-goog-resource-state'] as string | undefined;

  if (!channelId) {
    functions.logger.error('No channelId received', {
      resourceState,
      headers: request.headers,
    });
    throw new Error('No channelId received');
  }
  if (!resourceId) {
    functions.logger.error('No resourceId received', {
      resourceState,
      headers: request.headers,
    });
    throw new Error('No resourceId received');
  }

  // @TODO: add security, how can we confirm this function is only accessible from Google?

  const result = await findCalendarByWatcher(channelId, resourceId);
  if (!result) {
    functions.logger.warn("Calendar doesn't exist", {
      resourceState,
      channelId,
      resourceId,
    });
    // Since we can't unwatch the calendar because we don't have userId at our disposal, just OK
    response.sendStatus(200);
    return;
  }
  const [calendarId, calendar] = result;

  switch (resourceState) {
    // A new channel was successfully created. You can expect to start receiving notifications for it.
    case 'sync': {
      functions.logger.info('New channel successfully created', {
        resourceState,
        channelId,
        resourceId,
        calendarId,
        userId: calendar.userId,
      });
      break;
    }

    case 'not_exists': {
      functions.logger.info("A resource doesn't exist", {
        resourceState,
        channelId,
        resourceId,
        calendarId,
        userId: calendar.userId,
      });
      // @todo handle this
      throw new Error('not_exists state');
    }

    case 'exists': {
      functions.logger.info('There was a change to a resource', {
        resourceState,
        channelId,
        resourceId,
        calendarId,
        userId: calendar.userId,
      });

      const previousWatcherLastUpdated =
        calendar.watcherLastUpdated || sub(new Date(), { minutes: 5 }).getTime();
      await updateCalendar(calendarId, {
        watcherLastUpdated: Date.now(),
      });

      const auth = await createGoogleApisAuth(calendar.userId);
      const calendarApi = google.calendar({ version: 'v3', auth });

      // Retrieving events changed since last sync to update asociated timeboxes
      // @link https://developers.google.com/calendar/v3/reference/events/lists
      await calendarApi.events
        .list({
          calendarId: calendar.providerCalendarId,
          // Lower bound for an event's last modification time (as a RFC3339 timestamp) to filter by.
          // When specified, entries deleted since this time will always be included regardless of showDeleted
          updatedMin: formatISO(previousWatcherLastUpdated),
          showDeleted: true, // to include all properties of deleted events
        })
        .then(async (response) => {
          const { items } = response.data;

          if ((items || []).length === 0) {
            functions.logger.info('No calendar event updates since last time', {
              previousWatcherLastUpdated,
              calendarId,
              providerCalendarId: calendar.providerCalendarId,
              userId: calendar.userId,
            });
            return;
          }

          const itemsWithTaskIds = (items || []).filter(
            (item) => item.extendedProperties?.private?.taskId,
          );
          const itemsWithoutTaskIds = (items || []).filter(
            (item) => !item.extendedProperties?.private?.taskId,
          );

          const deletedItems = itemsWithTaskIds.filter((item) => item.status === 'cancelled');
          const updatedItems = itemsWithTaskIds.filter((item) => item.status !== 'cancelled');

          functions.logger.info('Summary of event task changes', {
            deletedItemsCount: deletedItems.length,
            updatedItemsCount: updatedItems.length,
            itemsWithoutTaskIds: itemsWithoutTaskIds.length,
            calendarId,
            providerCalendarId: calendar.providerCalendarId,
            userId: calendar.userId,
          });

          for (const deletedItem of deletedItems) {
            const taskId = deletedItem.extendedProperties?.private?.taskId;
            if (!taskId) {
              continue;
            }
            const task = await findById(taskId);
            if (!task) {
              // If task is deleted, maybe it's the task deletion what caused the event deletion
              continue;
            }

            if (
              task.calendarBlockProviderEventId === null &&
              task.calendarBlockStart === null &&
              task.calendarBlockEnd === null
            ) {
              functions.logger.info('No timebox clearing necessary, already up to date', {
                taskId,
                calendarEventId: deletedItem.id,
                calendarId,
                providerCalendarId: calendar.providerCalendarId,
                userId: calendar.userId,
              });
              continue;
            }

            await update(taskId, {
              calendarBlockCalendarId: null,
              calendarBlockStart: null,
              calendarBlockEnd: null,
              calendarBlockProvider: null,
              calendarBlockProviderCalendarId: null,
              calendarBlockProviderEventId: null,
            })
              .then(() => {
                functions.logger.info('Cleared timebox from task', {
                  taskId,
                  calendarEventId: deletedItem.id,
                  calendarId,
                  providerCalendarId: calendar.providerCalendarId,
                  userId: calendar.userId,
                });
              })
              .catch(() => {
                // If it fails because the doc was deleted in the meantime, no problem dude. Let it fail
                functions.logger.info(
                  'Document got deleted like lightning before clearing timebox',
                  {
                    taskId,
                    calendarEventId: deletedItem.id,
                    calendarId,
                    providerCalendarId: calendar.providerCalendarId,
                    userId: calendar.userId,
                  },
                );
              });
          }

          for (const updatedItem of updatedItems) {
            const taskId = updatedItem.extendedProperties?.private?.taskId;
            if (!taskId) {
              continue;
            }
            const task = await findById(taskId);
            // If task is deleted, the event will likely be deleted soon anyway
            if (!task) {
              continue;
            }
            if (!updatedItem.start || !updatedItem.end) {
              functions.logger.error('Odd event without start or end dates, no update possible', {
                taskId,
                calendarEventId: updatedItem.id,
                calendarId,
                providerCalendarId: calendar.providerCalendarId,
                userId: calendar.userId,
              });
              continue;
            }

            const updatedItemStart = parseGoogleCalendarDate(updatedItem.start);
            const updatedItemEnd = parseGoogleCalendarDate(updatedItem.end);

            if (!updatedItem.start || !updatedItem.end) {
              functions.logger.error("Couldn't parse the event dates, no update possible", {
                taskId,
                calendarEventId: updatedItem.id,
                calendarId,
                providerCalendarId: calendar.providerCalendarId,
                userId: calendar.userId,
                updatedItemStart,
                start: updatedItem.start,
                updatedItemEnd,
                end: updatedItem.end,
              });
              continue;
            }

            // If the event boundaries haven't changed, nothing to update on the timebox
            if (
              task.calendarBlockProviderEventId === updatedItem.id &&
              task.calendarBlockProviderCalendarId === calendar.providerCalendarId &&
              task.calendarBlockStart === updatedItemStart &&
              task.calendarBlockEnd === updatedItemEnd
            ) {
              functions.logger.info('No timebox updating necessary, already up to date', {
                taskId,
                calendarEventId: updatedItem.id,
                calendarId,
                providerCalendarId: calendar.providerCalendarId,
                userId: calendar.userId,
              });
              continue;
            }

            await update(taskId, {
              calendarBlockCalendarId: calendarId,
              scheduledStart: updatedItemStart,
              calendarBlockStart: updatedItemStart,
              calendarBlockEnd: updatedItemEnd,
              calendarBlockProvider: CalendarProviders.Google,
              calendarBlockProviderCalendarId: calendar.providerCalendarId,
              calendarBlockProviderEventId: updatedItem.id,
            })
              .then(() => {
                functions.logger.info('Updated timebox from task', {
                  taskId,
                  calendarEventId: updatedItem.id,
                  calendarId,
                  providerCalendarId: calendar.providerCalendarId,
                  userId: calendar.userId,
                });
              })
              .catch(() => {
                // If it fails because the doc was deleted in the meantime, no problem dude. Let it fail
                functions.logger.info(
                  'Document got deleted like lightning before updating timebox',
                  {
                    taskId,
                    calendarEventId: updatedItem.id,
                    calendarId,
                    providerCalendarId: calendar.providerCalendarId,
                    userId: calendar.userId,
                  },
                );
              });
          }
        });

      break;
    }

    default: {
      throw new Error(`Unknown resourceState "${resourceState}"`);
    }
  }

  response.sendStatus(200);
});
