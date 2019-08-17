import admin from 'firebase-admin';

const TASKS = 'tasks'; // collection name

interface Task {
  title: string;
  impact: number;
  effort: number;
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

export const findbyId = async (id: string) : Promise<[object?, number?, string?]> => {
  const db = admin.firestore();

  try {
    const docRef = db.collection(TASKS).doc(id);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      return [docSnapshot.data(), undefined, undefined];
    }
    return [undefined, 404, 'Not found'];
  } catch (error) {
    return [undefined, 500, error];
  }
};

export const create = async (userId: string, task: Task) : Promise<[[string, object?]?, number?, string?]> => {
  if (task.impact < 1 || task.impact > 7) {
    return [undefined, 400, 'Impact must be between 1 and 7'];
  }
  if (task.effort < 1 || task.effort > 7) {
    return [undefined, 400, 'Effort must be between 1 and 7'];
  }

  const finalTask = {
    ...KEY_DEFAULTS,
    ...task,
    created: Date.now(),
    userId,
  };

  const db = admin.firestore();

  try {
    const docRef = await db.collection(TASKS).add(finalTask);
    const docSnapshot = await docRef.get();
    return [[docSnapshot.id, docSnapshot.data()], undefined, undefined];
  } catch (error) {
    return [undefined, 500, error];
  }
};
