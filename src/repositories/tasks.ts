/**
 * Functions to interact with task entities.
 */

import admin from 'firebase-admin';
import { Task } from '../types';

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

export const create = async (userId: string, task: Task): Promise<[string, Task]> => {
  const finalTask: Task = {
    ...KEY_DEFAULTS,
    ...task,
    created: Date.now(),
    userId,
  };

  const db = admin.firestore();

  const docRef = await db.collection(COLLECTION).add(finalTask);
  const docSnapshot = await docRef.get();
  return [docSnapshot.id, docSnapshot.data() as Task];
};

export const update = async (id: string, task: Partial<Task>): Promise<undefined> => {
  const db = admin.firestore();
  await db.collection(COLLECTION).doc(id).update(task);
  return;
};
