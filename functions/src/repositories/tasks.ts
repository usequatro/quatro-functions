import admin from 'firebase-admin';
import HttpError from '../HttpError';

const TASKS = 'tasks'; // collection name

interface MinimalTask {
  title: string,
  effort: number,
  impact: number,
}

interface Task extends MinimalTask{
  blockedBy?: Array<string>,
  completed?: number | null,
  created?: number | null,
  description?: string | null,
  due?: number | null,
  scheduledStart?: number | null,
  trashed?: number | null,
  userId?: string,
};

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

export const findbyId = async (id: string) : Promise<Task> => {
  const db = admin.firestore();

  const docRef = db.collection(TASKS).doc(id);
  const docSnapshot = await docRef.get();

  if (docSnapshot.exists) {
    const task = <Task> docSnapshot.data();
    return task;
  }
  throw new HttpError(404, 'Task not found');
};

export const create = async (userId: string, task: MinimalTask) : Promise<[string, object?]> => {
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
  return [docSnapshot.id, docSnapshot.data()];
};
