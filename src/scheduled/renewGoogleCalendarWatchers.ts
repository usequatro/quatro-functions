import * as functions from 'firebase-functions';
import { google, calendar_v3 } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

import {
  findCalendarsWithExpiringGoogleCalendarChannel,
  updateCalendar,
} from '../repositories/calendars';
import createGoogleApisAuth from '../utils/createGoogleApisAuth';

const THRESHOLD_HOURS = 3;
const hoursToMillis = (hours: number) => hours * 60 * 60 * 1000;

const GOOGLE_CALENDAR_WEBHOOK_URL = functions.config().googleapis.calendarwebhookurl;

/**
 * Scheduled task for renewing Google Calendar watchers that are about to expire
 * Note that this functionality uses Google Cloud Pub/Sub topic and Google Cloud Scheduler, separate
 * APIs that also need to be enabled.
 * @link https://developers.google.com/calendar/v3/push#renewing-notification-channels
 * @link https://firebase.google.com/docs/functions/schedule-functions
 * @link https://crontab.guru/
 */
export default functions.pubsub
  .schedule('0 * * * *') // https://crontab.guru/every-hour
  .onRun(async () => {
    const expiringCalendarWrappers = await findCalendarsWithExpiringGoogleCalendarChannel(
      hoursToMillis(THRESHOLD_HOURS),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logRecords: { [key: string]: any } = {};

    for (const [id, calendar] of expiringCalendarWrappers) {
      const auth = await createGoogleApisAuth(calendar.userId);
      const calendarApi = google.calendar({ version: 'v3', auth });

      const oldWatcherChannelId = calendar.watcherChannelId;
      const oldWatcherResourceId = calendar.watcherResourceId; // this shouldn't change anyway

      // Google Calendar API wants us to generate a unique ID for the channel ourselves
      const channelId = uuidv4();

      logRecords[id] = {
        calendarId: id,
        oldExpiration: calendar.watcherExpiration,
        oldWatcherChannelId,
        oldWatcherResourceId,
        providerCalendarId: calendar.providerCalendarId,
        newWatcherCreated: false,
        oldWatcherStopped: false,
        error: null,
      };

      // @link https://developers.google.com/calendar/v3/push
      // @link https://developers.google.com/calendar/v3/reference/events/watch
      await calendarApi.events
        .watch({
          calendarId: calendar.providerCalendarId,
          requestBody: {
            id: channelId,
            address: GOOGLE_CALENDAR_WEBHOOK_URL,
            type: 'web_hook',
          },
        })
        .then(
          (response) => {
            const {
              // ID of the watched resource. The resourceId property is a stable, version-independent identifier for the resource
              resourceId,
              // Actual expiration time as Unix timestamp (in ms)
              expiration,
            } = response.data as calendar_v3.Schema$Channel;

            logRecords[id] = {
              ...logRecords[id],
              newWatcherCreated: true,
              newWatcherChannelId: channelId,
              newWatcherResourceId: resourceId,
              newWatcherExpiration: expiration,
            };

            return updateCalendar(id, {
              watcherChannelId: channelId,
              watcherResourceId: resourceId,
              watcherExpiration: expiration ? parseInt(`${expiration}`, 10) : null,
            });
          },
          (error) => {
            // For logging it later
            error.customMessage =
              'Error response from /calendar/v3/calendars/calendarId/events/watch';
            throw error;
          },
        )
        .then(() =>
          calendarApi.channels
            .stop({
              requestBody: {
                id: oldWatcherChannelId,
                resourceId: oldWatcherResourceId,
              },
            })
            .then(
              () => {
                logRecords[id] = {
                  ...logRecords[id],
                  oldWatcherStopped: true,
                };
              },
              (error) => {
                // For logging it later
                error.customMessage = 'Error response from channels.stop';
                throw error;
              },
            ),
        )
        .catch((error) => {
          logRecords[id].error = {
            message: error.customMessage,
            errorMessage: error.message,
            errors: error.errors,
            calendarId: id,
            oldWatcherChannelId,
            oldWatcherResourceId,
          };
        });
    }

    const logRecordsLength = Object.keys(logRecords).length;
    if (logRecordsLength > 0) {
      functions.logger.info('Google Calendar watcher renewals performed', {
        length: logRecordsLength,
        data: logRecords,
      });
    } else {
      functions.logger.info('Google Calendar watcher had no renewals to perform');
    }

    const errors = Object.values(logRecords).filter((logRecord) => logRecord.error);
    if (errors.length > 0) {
      functions.logger.error('Errors on Google Calendar watcher renewals', {
        length: errors.length,
        data: errors,
      });
    }
  });
