/**
 * Functions to interact with recurring config entities.
 */

import admin from 'firebase-admin';
import { RecurringConfig, OptionalKeys } from '../types';

const COLLECTION = 'recurringConfigs';

export const findAll = async (): Promise<[string, RecurringConfig][]> => {
  const db = admin.firestore();

  const collectionRef = db.collection(COLLECTION);
  const querySnapshot = await collectionRef.get();

  const recurringConfigs = querySnapshot.docs.map((doc): [string, RecurringConfig] => [
    doc.id,
    <RecurringConfig>doc.data(),
  ]);

  return recurringConfigs;
};

export const findById = async (id: string): Promise<RecurringConfig | undefined> => {
  const db = admin.firestore();

  const docRef = db.collection(COLLECTION).doc(id);
  const docSnapshot = await docRef.get();

  return docSnapshot.exists ? <RecurringConfig>docSnapshot.data() : undefined;
};

export const findRecurringConfigByMostRecentTaskId = async (
  mostRecentTaskId: string,
): Promise<[string, RecurringConfig] | undefined> => {
  const docSnapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('mostRecentTaskId', '==', mostRecentTaskId)
    .limit(1)
    .get();
  return docSnapshot.docs.length > 0
    ? [docSnapshot.docs[0].id, <RecurringConfig>docSnapshot.docs[0].data()]
    : undefined;
};

export const findRecurringConfigsByUserId = async (
  userId: string,
): Promise<[string, RecurringConfig][]> => {
  const snapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .get();
  return snapshot.docs.map((doc) => [doc.id, doc.data() as RecurringConfig]);
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

  const docRef = await db.collection(COLLECTION).add(finalEntity);
  const docSnapshot = await docRef.get();
  return [docSnapshot.id, docSnapshot.data() as RecurringConfig];
};

export const update = async (
  rcId: string,
  updates: OptionalKeys<RecurringConfig>,
): Promise<void> => {
  const db = admin.firestore();

  const docRef = await db.collection(COLLECTION).doc(rcId);
  await docRef.set(updates, { merge: true });
  return;
};

export const deleteRecurringConfig = (id: string): Promise<FirebaseFirestore.WriteResult> =>
  admin.firestore().collection(COLLECTION).doc(id).delete();
