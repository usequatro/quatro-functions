/**
 * Quatro's Firebase functions
 */

import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

// import slack from './slack/app';
import notifyGoogleCalendarChange from './https/notifyGoogleCalendarChange';
import processProviderUnlink from './callable/processProviderUnlink';
import storeAuthCode from './callable/storeAuthCode';
import createRecurringTasks from './scheduled/createRecurringTasks';
import renewGoogleCalendarWatchers from './scheduled/renewGoogleCalendarWatchers';
// import trackNewAcUser from './triggers/trackNewAcUser';
import trackDeleteAcUser from './triggers/trackDeleteAcUser';
// import trackCreateCalendar from './triggers/trackCreateCalendar';
import trackDeleteCalendar from './triggers/trackDeleteCalendar';
import syncTaskWithGoogleCalendar from './triggers/syncTaskWithGoogleCalendar';
import watchCalendar from './triggers/watchCalendar';
import unwatchCalendar from './triggers/unwatchCalendar';

admin.initializeApp(functions.config().firebase);

// Firebase Functions Documentation
// https://firebase.google.com/docs/functions/typescript

export {
  // https
  notifyGoogleCalendarChange,
  // slack,
  // callable
  processProviderUnlink,
  storeAuthCode,
  // scheduled
  createRecurringTasks,
  renewGoogleCalendarWatchers,
  // triggers
  // trackNewAcUser,
  trackDeleteAcUser,
  // trackCreateCalendar,
  trackDeleteCalendar,
  syncTaskWithGoogleCalendar,
  watchCalendar,
  unwatchCalendar,
};
