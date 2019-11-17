/**
 * Aizen's Firebase functions
 */

import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

import slackApp from './slack/app';
import createRecurringTasks from './cron/createRecurringTasks';

admin.initializeApp(functions.config().firebase);

export const slack = functions.https.onRequest(slackApp);

/**
 * Scheduled task for creating recurring tasks every morning.
 * Note that this functionality uses Google Cloud Pub/Sub topic and Google Cloud Scheduler, separate
 * APIs that also need to be enabled.
 * @see https://firebase.google.com/docs/functions/schedule-functions
 */
export const scheduledCreateRecurringTasks = functions.pubsub
  .schedule('1 0 * * *') // This will be run every day at 00:01 AM Eastern
  .timeZone('America/New_York')
  .onRun(async (context) => {
    await createRecurringTasks();
    return null;
  });

// Temporary, to test calling the funcionality directly
export const recurring = functions.https.onRequest(async (req: functions.Request, res: functions.Response) => {
  const dayOffset = parseInt(req.query.offset || 0, 10);
  await createRecurringTasks(dayOffset);
  res.status(200).send('Recurring tasks handled');
});

/**
 * Data migrations.
 * For running, uncomment this code, deploy, execute, comment and deploy.
 * Migrations are found in /src/migrations
 */
// export const migrate = functions.https.onRequest(async (request, response) => {
  // const db = admin.firestore();

  // await addKeyToAllTasks(db, 'prioritizedAheadOf', null);

  // await deleteKeyForAllTasks(db, 'blockers');

  // await renameKeyInAllTasks(db, 'thrased', 'trashed', null);

  // await transformValueForAllTasks(db, 'blockedBy', (oldValue) => {
  //   if (!oldValue || !oldValue.length) {
  //     return [];
  //   }
  //   return oldValue.map((blockedById: string|object) => (
  //     typeof blockedById === 'object'
  //       ? blockedById
  //       : {
  //         type: 'task',
  //         config: {
  //           taskId: blockedById,
  //         },
  //       }
  //   ))
  // });

//   response.send("Done!");
// });
