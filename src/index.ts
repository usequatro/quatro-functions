/**
 * Quatro's Firebase functions
 */

import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

// import slack from './slack/app';
import storeAuthCode from './endpoints/storeAuthCode';
import createRecurringTasks from './scheduled/createRecurringTasks';
import trackNewAcUser from './triggers/trackNewAcUser';
import trackDeleteAcUser from './triggers/trackDeleteAcUser';
import trackCreateCalendar from './triggers/trackCreateCalendar';
import trackDeleteCalendar from './triggers/trackDeleteCalendar';
import syncTaskWithGoogleCalendar from './triggers/syncTaskWithGoogleCalendar';

admin.initializeApp(functions.config().firebase);

// Firebase Functions Documentation
// https://firebase.google.com/docs/functions/typescript

export {
  // endpoints
  // slack,
  storeAuthCode,
  // scheduled
  createRecurringTasks,
  // triggers
  trackNewAcUser,
  trackDeleteAcUser,
  trackCreateCalendar,
  trackDeleteCalendar,
  syncTaskWithGoogleCalendar,
  // ...
};
