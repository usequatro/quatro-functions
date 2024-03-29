/**
 * Functions to interact with task entities.
 */

import admin from 'firebase-admin';
import { taskSchema } from '../schemas/task';
import { Task } from '../types/task';
import calculateTaskScore from '../utils/calculateTaskScore';

export const TASKS_COLLECTION = 'tasks';

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

  const docRef = db.collection(TASKS_COLLECTION).doc(id);
  const docSnapshot = await docRef.get();

  return docSnapshot.exists ? <Task>docSnapshot.data() : undefined;
};

export const findTasksByUserId = async (userId: string): Promise<[string, Task][]> => {
  const snapshot = await admin
    .firestore()
    .collection(TASKS_COLLECTION)
    .where('userId', '==', userId)
    .get();
  return snapshot.docs.map((doc) => [doc.id, doc.data() as Task]);
};

export const findTopTasksForUserForDate = async (
  userId: string,
  date: number,
): Promise<[string, Task][]> => {
  const clearTasks: [string, Task][] = (
    await admin
      .firestore()
      .collection(TASKS_COLLECTION)
      .where('userId', '==', userId)
      .where('completed', '==', null)
      .get()
  ).docs.map((doc) => [doc.id, doc.data() as Task]);

  // Filter out tasks that will still be scheduled or snoozed
  const allTasksActiveAtDate = clearTasks.filter(
    ([, task]) =>
      (!task.blockedBy || task.blockedBy.length === 0) &&
      (task.scheduledStart == null || task.scheduledStart <= date) &&
      (task.snoozedUntil == null || task.snoozedUntil <= date),
  );

  const tasksWithScores: [string, Task, number][] = allTasksActiveAtDate.map(([id, task]) => [
    id,
    task,
    calculateTaskScore(task, date),
  ]);

  tasksWithScores.sort(([, , scoreA], [, , scoreB]) => {
    if (scoreA > scoreB) {
      return -1;
    }
    if (scoreB > scoreA) {
      return 1;
    }
    return 0;
  });

  return tasksWithScores.slice(0, 4).map(([id, task]) => [id, task]);
};

export const findCompletedTasksByUserIdInRange = async (
  userId: string,
  completedStart: number,
  completedEnd: number,
  limit = 50,
): Promise<[string, Task][]> => {
  const snapshot = await admin
    .firestore()
    .collection(TASKS_COLLECTION)
    .where('userId', '==', userId)
    .where('completed', '>=', completedStart)
    .where('completed', '<', completedEnd)
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => [doc.id, doc.data() as Task]);
};

export const findLastByRecurringConfigId = async (
  recurringConfigId: string,
): Promise<[string, Task] | [null, null]> => {
  const db = admin.firestore();

  const query = db
    .collection(TASKS_COLLECTION)
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
    .collection(TASKS_COLLECTION)
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
  const docRef = await db.collection(TASKS_COLLECTION).add(validPayload);
  return docRef.id;
};

export const update = async (id: string, task: Partial<Task>): Promise<undefined> => {
  const validPayload = await taskSchema.validateAsync(task, {
    stripUnknown: true,
    noDefaults: true,
    presence: 'optional',
  });
  const db = admin.firestore();
  await db.collection(TASKS_COLLECTION).doc(id).update(validPayload);
  return;
};

export const deleteTask = (id: string): Promise<FirebaseFirestore.WriteResult> =>
  admin.firestore().collection(TASKS_COLLECTION).doc(id).delete();
