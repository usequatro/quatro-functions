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

export const scheduledCreateRecurringTasks = functions.pubsub
  .schedule('1 0 * * *') // This will be run every day at 00:01 AM Eastern
  .timeZone('America/New_York')
  .onRun(async (context) => {
    await createRecurringTasks();
    return null;
  });

// temporary, to test calling the funcionality directly
export const recurring = functions.https.onRequest(async (req: functions.Request, res: functions.Response) => {
  const dayOffset = parseInt(req.query.offset || 0, 10);
  await createRecurringTasks(dayOffset);
  res.status(200).send('Recurring tasks handled');
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
