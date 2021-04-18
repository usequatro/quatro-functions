/**
 * Functions to interact with task entities.
 */

import admin from 'firebase-admin';
import { taskSchema } from '../schemas/task';
import { Task } from '../types/task';

const COLLECTION = 'tasks';

const KEY_DEFAULTS = {
  blockedBy: [],
  completed: null,
  created: null,
  description: '',
  due: null,
  effort: null,
  impact: null,
  scheduledStart: null,
  title: '',
  userId: null,
  recurringConfigId: null,
};

export const findById = async (id: string): Promise<Task | undefined> => {
  const db = admin.firestore();

  const docRef = db.collection(COLLECTION).doc(id);
  const docSnapshot = await docRef.get();

  return docSnapshot.exists ? <Task>docSnapshot.data() : undefined;
};

export const findTasksByUserId = async (userId: string): Promise<[string, Task][]> => {
  const snapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .get();
  return snapshot.docs.map((doc) => [doc.id, doc.data() as Task]);
};

export const findLastByRecurringConfigId = async (
  recurringConfigId: string,
): Promise<[string, Task] | [null, null]> => {
  const db = admin.firestore();

  const query = db
    .collection(COLLECTION)
    .where('recurringConfigId', '==', recurringConfigId)
    .orderBy('created', 'desc')
    .limit(1);
  const querySnapshot = await query.get();

  return querySnapshot.docs.length > 0
    ? [querySnapshot.docs[0].id, <Task>querySnapshot.docs[0].data()]
    : [null, null];
};

export const findIncompleteByCalendarBlockCalendarId = async (
  userId: string,
  calendarBlockCalendarId: string,
): Promise<Array<[string, Task]>> => {
  const db = admin.firestore();

  const query = db
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .where('calendarBlockCalendarId', '==', calendarBlockCalendarId)
    .where('completed', '==', null)
    .limit(1000); // high limit that likely won't be reached
  const querySnapshot = await query.get();

  return querySnapshot.docs.map((doc) => [doc.id, <Task>doc.data()]);
};

export const create = async (userId: string, task: Partial<Task>): Promise<string> => {
  const validPayload = await taskSchema.validateAsync(
    {
      ...KEY_DEFAULTS,
      ...task,
      created: Date.now(),
      userId,
    },
    {
      stripUnknown: true,
    },
  );

  const db = admin.firestore();
  const docRef = await db.collection(COLLECTION).add(validPayload);
  return docRef.id;
};

export const update = async (id: string, task: Partial<Task>): Promise<undefined> => {
  const validPayload = await taskSchema.validateAsync(task, {
    stripUnknown: true,
    noDefaults: true,
    presence: 'optional',
  });
  const db = admin.firestore();
  await db.collection(COLLECTION).doc(id).update(validPayload);
  return;
};

export const deleteTask = (id: string): Promise<FirebaseFirestore.WriteResult> =>
  admin.firestore().collection(COLLECTION).doc(id).delete();
