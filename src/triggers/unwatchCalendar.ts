import * as functions from 'firebase-functions';
import { google } from 'googleapis';
import isPast from 'date-fns/isPast';

import REGION from '../constants/region';
import { COLLECTION as CALENDARS_COLLECTION } from '../repositories/calendars';
import { Calendar } from '../schemas/calendar';
import createGoogleApisAuth from '../utils/createGoogleApisAuth';

export default functions
  .region(REGION)
  .firestore.document(`${CALENDARS_COLLECTION}/{calendarId}`)
  .onDelete(async (change) => {
    const calendar = change.data() as Calendar;
    const calendarId = change.id;

    if (!calendar.watcherChannelId) {
      functions.logger.info('Skipping because no watcherChannelId set', {
        calendarId,
      });
      return;
    }
    if (calendar.watcherExpiration && isPast(calendar.watcherExpiration)) {
      functions.logger.info('Skipping because watcher was already expired', {
        calendarId,
        watcherExpiration: calendar.watcherExpiration,
      });
      return;
    }

    const auth = await createGoogleApisAuth(calendar.userId);
    const calendarApi = google.calendar({ version: 'v3', auth });

    // @link https://developers.google.com/calendar/v3/reference/channels/stop
    return calendarApi.channels
      .stop({
        requestBody: {
          id: calendar.watcherChannelId,
          resourceId: calendar.watcherResourceId,
        },
      })
      .then(() => {
        functions.logger.info('Stopped watching deleted calendar', {
          calendarId,
          watcherChannelId: calendar.watcherChannelId,
          watcherResourceId: calendar.watcherResourceId,
        });
      })
      .catch((error) => {
        functions.logger.error('Error response from channels.stop', {
          calendarId,
          errorMessage: error.message,
          errors: error.errors,
        });
        throw error;
      });
  });
