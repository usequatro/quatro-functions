import * as functions from 'firebase-functions';
import cors from 'cors';

import REGION from '../constants/region';
import { findCalendarByWatcher, updateCalendar } from '../repositories/calendars';

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
      await updateCalendar(calendarId, {
        watcherLastUpdated: Date.now(),
      });

      // @todo, check current uncompleted Quatro tasks connected to an event, do they need updating?

      break;
    }

    default: {
      throw new Error(`Unknown resourceState "${resourceState}"`);
    }
  }

  response.sendStatus(200);
});
