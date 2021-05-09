/**
 * Quatro's Firebase functions
 */

import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

// import slack from './slack/app';
import notifyGoogleCalendarChange from './functions/https/notifyGoogleCalendarChange';
import sendDailyDigest from './functions/https/sendDailyDigest';
import processProviderUnlink from './functions/callable/processProviderUnlink';
import storeAuthCode from './functions/callable/storeAuthCode';
import createRecurringTasks from './functions/scheduled/createRecurringTasks';
import renewGoogleCalendarWatchers from './functions/scheduled/renewGoogleCalendarWatchers';
// import trackNewAcUser from './triggers/trackNewAcUser';
import trackDeleteAcUser from './functions/triggers/trackDeleteAcUser';
// import trackCreateCalendar from './triggers/trackCreateCalendar';
import trackDeleteCalendar from './functions/triggers/trackDeleteCalendar';
import syncTaskWithGoogleCalendar from './functions/triggers/syncTaskWithGoogleCalendar';
import watchCalendar from './functions/triggers/watchCalendar';
import unwatchCalendar from './functions/triggers/unwatchCalendar';
import trackTaskOnCreate from './functions/triggers/trackTaskOnCreate';
import trackTaskOnDelete from './functions/triggers/trackTaskOnDelete';
import trackTaskOnUpdate from './functions/triggers/trackTaskOnUpdate';

admin.initializeApp(functions.config().firebase);

// Firebase Functions Documentation
// https://firebase.google.com/docs/functions/typescript

export {
  // https
  notifyGoogleCalendarChange,
  sendDailyDigest,
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
  trackTaskOnCreate,
  trackTaskOnDelete,
  trackTaskOnUpdate,
  syncTaskWithGoogleCalendar,
  watchCalendar,
  unwatchCalendar,
};
