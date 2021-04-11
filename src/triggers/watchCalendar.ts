import * as functions from 'firebase-functions';
import { google, calendar_v3 } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

import REGION from '../constants/region';
import { updateCalendar, COLLECTION as CALENDARS_COLLECTION } from '../repositories/calendars';
import { Calendar } from '../types/calendar';
import createGoogleApisAuth from '../utils/createGoogleApisAuth';

const GOOGLE_CALENDAR_WEBHOOK_URL = functions.config().googleapis.calendarwebhookurl;

export default functions
  .region(REGION)
  .firestore.document(`${CALENDARS_COLLECTION}/{calendarId}`)
  .onCreate(async (change) => {
    const calendar = change.data() as Calendar;
    const calendarId = change.id;

    if (!calendar.userId) {
      throw new Error(`No userId in calendar ${calendarId}`);
    }

    const auth = await createGoogleApisAuth(calendar.userId);
    const calendarApi = google.calendar({ version: 'v3', auth });

    // Google Calendar API wants us to generate a unique ID for the channel ourselves
    const channelId = uuidv4();

    // @link https://developers.google.com/calendar/v3/push
    // @link https://developers.google.com/calendar/v3/reference/events/watch
    return calendarApi.events
      .watch({
        calendarId: calendar.providerCalendarId,
        requestBody: {
          id: channelId,
          address: GOOGLE_CALENDAR_WEBHOOK_URL,
          type: 'web_hook',
        },
      })
      .then((response) => {
        const {
          // Version-specific ID of the watched resource
          resourceUri,
          // ID of the watched resource. The resourceId property is a stable, version-independent identifier for the resource
          resourceId,
          // Actual expiration time as Unix timestamp (in ms)
          expiration,
        } = response.data as calendar_v3.Schema$Channel;

        functions.logger.info('Established Google Calendar watcher', {
          channelId,
          resourceUri,
          resourceId,
          expiration,
          calendarId,
          providerCalendarId: calendar.providerCalendarId,
          notifyUrl: GOOGLE_CALENDAR_WEBHOOK_URL,
        });

        // If somehow the calendar was deleted before this update, this will fail
        // We should undo the action if so
        return updateCalendar(calendarId, {
          watcherChannelId: channelId,
          watcherResourceId: resourceId,
          watcherExpiration: expiration ? parseInt(`${expiration}`, 10) : null,
        });
      })
      .catch((error) => {
        functions.logger.error('Error response from events.watch', {
          calendarId,
          errorMessage: error.message,
          errors: error.errors,
        });
        throw error;
      });
  });
