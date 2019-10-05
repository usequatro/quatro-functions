import admin from 'firebase-admin';
import HttpError from '../HttpError';
import { RecurringConfig, OptionalKeys } from '../types';

const RECURRING_CONFIGS = 'recurringConfigs'; // collection name

export const findAll = async () : Promise<[string, RecurringConfig][]> => {
  const db = admin.firestore();

  const collectionRef = db.collection(RECURRING_CONFIGS);
  const querySnapshot = await collectionRef.get();

  const recurringConfigs = querySnapshot.docs.map((doc): [string, RecurringConfig] => ([
    doc.id,
    <RecurringConfig> doc.data(),
  ]));

  return recurringConfigs;
};

export const findById = async (id: string) : Promise<RecurringConfig> => {
  const db = admin.firestore();

  const docRef = db.collection(RECURRING_CONFIGS).doc(id);
  const docSnapshot = await docRef.get();

  if (docSnapshot.exists) {
    const entity = <RecurringConfig> docSnapshot.data();
    return entity;
  }
  throw new HttpError(404, 'Recurring config not found');
};

export const create = async (userId: string, entity: RecurringConfig) : Promise<[string, object?]> => {
  const finalEntity : RecurringConfig = {
    ...entity,
    userId,
  };

  const db = admin.firestore();

  const docRef = await db.collection(RECURRING_CONFIGS).add(finalEntity);
  const docSnapshot = await docRef.get();
  return [docSnapshot.id, docSnapshot.data()];
};

export const update = async (rcId: string, updates: OptionalKeys<RecurringConfig>) => {
  const db = admin.firestore();

  const docRef = await db.collection(RECURRING_CONFIGS).doc(rcId);
  return docRef.set(updates, { merge: true });
};
