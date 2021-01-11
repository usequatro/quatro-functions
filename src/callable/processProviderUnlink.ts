import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import { calendar_v3, google } from 'googleapis';
import isPast from 'date-fns/isPast';

import REGION from '../constants/region';
import { Calendar } from '../schemas/calendar';
import { deleteCalendar, findCalendarsByUserId } from '../repositories/calendars';
import createGoogleApisAuth from '../utils/createGoogleApisAuth';

const unwatchCalendars = async (calendarsToUnwatch: [string, Calendar][]) => {
  const apiInstancesByUserId: { [userId: string]: calendar_v3.Calendar } = {};

  for (const [id, calendar] of calendarsToUnwatch) {
    if (
      !calendar.watcherChannelId ||
      (calendar.watcherExpiration && isPast(calendar.watcherExpiration))
    ) {
      continue;
    }

    try {
      if (!apiInstancesByUserId[calendar.userId]) {
        apiInstancesByUserId[calendar.userId] = await (async () => {
          const auth = await createGoogleApisAuth(calendar.userId);
          return google.calendar({ version: 'v3', auth });
        })();
      }
    } catch (error) {
      functions.logger.error('Error creating Google Api Auth for user of calendar to unwatch', {
        calendarId: id,
        error: error,
      });
      continue;
    }

    const calendarApi = apiInstancesByUserId[calendar.userId];

    await calendarApi.channels
      .stop({
        requestBody: {
          id: calendar.watcherChannelId,
          resourceId: calendar.watcherResourceId,
        },
      })
      .then(() => {
        functions.logger.info('Stopped watching deleted calendar', {
          calendarId: id,
          watcherChannelId: calendar.watcherChannelId,
          watcherResourceId: calendar.watcherResourceId,
        });
      })
      .catch((error) => {
        functions.logger.error('Error response from channels.stop', {
          calendarId: id,
          errorMessage: error.message,
          errors: error.errors,
        });
      });
  }
};

const deleteCalendars = async (calendarIds: string[]) => {
  for (const id of calendarIds) {
    await deleteCalendar(id)
      .then(() => {
        functions.logger.info('Deleted user calendar', {
          id,
        });
      })
      .catch((error) => {
        functions.logger.error('Error deleting user calendar', {
          id,
          error: error,
        });
      });
  }
};

/**
 * @link https://developers.google.com/identity/sign-in/web/server-side-flow
 */
export default functions.region(REGION).https.onCall(async (data, context) => {
  // Checking that the user is authenticated.
  if (!context.auth) {
    functions.logger.error('No user authenticated');
    // @link https://firebase.google.com/docs/reference/swift/firebasefunctions/api/reference/Enums/FunctionsErrorCode
    throw new functions.https.HttpsError(
      'failed-precondition',
      'The function must be called while authenticated.',
    );
  }
  if (!data.unlinkedProviderId) {
    functions.logger.error('No unlinkedProviderId received', { userId: context.auth.uid });
    throw new functions.https.HttpsError('invalid-argument', 'unlinkedProviderId is missing.');
  }

  const firebaseUser = await admin.auth().getUser(context.auth.uid);
  const unlinkedProvider = firebaseUser.providerData.find(
    (provider) => provider.providerId === data.unlinkedProviderId,
  );

  if (unlinkedProvider) {
    functions.logger.error('Unexpectedly provider is still pressent', {
      userId: context.auth.uid,
      unlinkedProviderId: data.unlinkedProviderId,
      unlinkedProviderFound: unlinkedProvider,
    });
    throw new Error('Unexpectedly provider is still pressent');
  }

  switch (data.unlinkedProviderId) {
    case 'google.com': {
      // @todo: Remove tag from Active Campaign

      // Remove calendars and cancel their watchers
      const userCalendars = await findCalendarsByUserId(context.auth.uid);
      const googleCalendars = userCalendars.filter(
        ([, calendar]) => calendar.provider === 'google',
      );

      await unwatchCalendars(googleCalendars);
      await deleteCalendars(googleCalendars.map(([id]) => id));

      break;
    }
    default: {
      functions.logger.warn('Uknown provider unlinked', {
        userId: context.auth.uid,
        unlinkedProviderId: data.unlinkedProviderId,
      });
    }
  }

  return {};
});
