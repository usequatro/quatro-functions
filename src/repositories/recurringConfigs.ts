/**
 * Functions to interact with recurring config entities.
 */

import admin from 'firebase-admin';
import { RecurringConfig, OptionalKeys } from '../types';

const RECURRING_CONFIGS = 'recurringConfigs'; // collection name

export const findAll = async (): Promise<[string, RecurringConfig][]> => {
  const db = admin.firestore();

  const collectionRef = db.collection(RECURRING_CONFIGS);
  const querySnapshot = await collectionRef.get();

  const recurringConfigs = querySnapshot.docs.map((doc): [string, RecurringConfig] => [
    doc.id,
    <RecurringConfig>doc.data(),
  ]);

  return recurringConfigs;
};

export const findById = async (id: string): Promise<RecurringConfig | undefined> => {
  const db = admin.firestore();

  const docRef = db.collection(RECURRING_CONFIGS).doc(id);
  const docSnapshot = await docRef.get();

  return docSnapshot.exists ? <RecurringConfig>docSnapshot.data() : undefined;
};

export const create = async (
  userId: string,
  entity: RecurringConfig,
): Promise<[string, RecurringConfig]> => {
  const finalEntity: RecurringConfig = {
    ...entity,
    userId,
  };

  const db = admin.firestore();

  const docRef = await db.collection(RECURRING_CONFIGS).add(finalEntity);
  const docSnapshot = await docRef.get();
  return [docSnapshot.id, docSnapshot.data() as RecurringConfig];
};

export const update = async (
  rcId: string,
  updates: OptionalKeys<RecurringConfig>,
): Promise<void> => {
  const db = admin.firestore();

  const docRef = await db.collection(RECURRING_CONFIGS).doc(rcId);
  await docRef.set(updates, { merge: true });
  return;
};
