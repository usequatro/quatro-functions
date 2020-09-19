/**
 * Functions to interact with task entities.
 */

import admin from 'firebase-admin';
import HttpError from '../HttpError';
import { Task } from '../types';

const TASKS = 'tasks'; // collection name

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
  trashed: null,
  userId: null,
};

export const findById = async (id: string) : Promise<Task> => {
  const db = admin.firestore();

  const docRef = db.collection(TASKS).doc(id);
  const docSnapshot = await docRef.get();

  if (docSnapshot.exists) {
    const task = <Task>docSnapshot.data();
    if (!task.trashed) {
      return task;
    }
  }

  throw new HttpError(404, 'Task not found');
};

export const findLastByRecurringConfigId = async (recurringConfigId: string) : Promise<[string, Task]|[null, null]> => {
  const db = admin.firestore();

  const query = db.collection(TASKS)
    .where('recurringConfigId', '==', recurringConfigId)
    .where('trashed', '==', null)
    .orderBy('created', 'desc')
    .limit(1);
  const querySnapshot = await query.get();

  return querySnapshot.docs.length > 0
    ? [querySnapshot.docs[0].id, <Task> querySnapshot.docs[0].data()]
    : [null, null];
};

export const create = async (userId: string, task: Task) : Promise<[string, Task]> => {
  if (task.impact < 1 || task.impact > 7) {
    throw new HttpError(400, 'Impact must be between 1 and 7');
  }
  if (task.effort < 1 || task.effort > 7) {
    throw new HttpError(400, 'Effort must be between 1 and 7');
  }

  const finalTask : Task = {
    ...KEY_DEFAULTS,
    ...task,
    created: Date.now(),
    userId,
  };

  const db = admin.firestore();

  const docRef = await db.collection(TASKS).add(finalTask);
  const docSnapshot = await docRef.get();
  return [docSnapshot.id, docSnapshot.data() as Task];
};
