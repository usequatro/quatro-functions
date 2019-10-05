// Command to deploy: firebase deploy --only functions

import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

import slackApp from './slack/app';
import createRecurringTasks from './cron/createRecurringTasks';

// import addKeyToAllTasks from './migrations/addKeyToAllTasks';
// import renameKeyInAllTasks from './migrations/renameKeyInAllTasks';
// import deleteKeyForAllTasks from './migrations/deleteKeyForAllTasks';
// import transformValueForAllTasks from './migrations/transformValueForAllTasks';

admin.initializeApp(functions.config().firebase);

export const slack = functions.https.onRequest(slackApp);

// This will be run every day at 00:00 AM Eastern!
// functions.pubsub.schedule('0 0 * * *').timeZone('America/New_York').onRun((context) => {
//   createRecurringTasks();
//   return null;
// });

// temp
export const recurring = functions.https.onRequest(async (req: functions.Request, res: functions.Response) => {
  await createRecurringTasks();
  res.send('all good');
});

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
