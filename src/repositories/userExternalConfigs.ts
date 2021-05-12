import admin from 'firebase-admin';

import { userExternalConfigSchema } from '../schemas/userExternalConfig';
import { UserExternalConfig } from '../types/userExternalConfig';

export const COLLECTION = 'userExternalConfigs';

export const getUserExternalConfig = async (
  userId: string,
): Promise<UserExternalConfig | undefined> => {
  const snapshot = await admin.firestore().collection(COLLECTION).doc(userId).get();
  return snapshot.exists ? (snapshot.data() as UserExternalConfig) : undefined;
};

type WriteResult = admin.firestore.WriteResult;

export const setUserExternalConfig = async (
  userId: string,
  payload: Partial<UserExternalConfig>,
): Promise<WriteResult> => {
  const validatedPayload = await userExternalConfigSchema.validateAsync(payload, {
    stripUnknown: true,
    noDefaults: true,
  });
  return admin
    .firestore()
    .collection(COLLECTION)
    .doc(userId)
    .set(validatedPayload, { merge: true });
};

export const updateUserExternalConfig = async (
  userId: string,
  payload: Partial<UserExternalConfig>,
): Promise<WriteResult> => {
  const validatedPayload = await userExternalConfigSchema.validateAsync(payload, {
    stripUnknown: true,
    noDefaults: true,
  });
  return admin.firestore().collection(COLLECTION).doc(userId).update(validatedPayload);
};

export const deleteUserExternalConfig = async (userId: string): Promise<WriteResult> =>
  admin.firestore().collection(COLLECTION).doc(userId).delete();

export const findUserExternalConfigsForDailyDigestEmails = async (
  timestamp: number,
): Promise<[string, UserExternalConfig][]> => {
  const dayAgo = timestamp - 1000 * 60 * 60 * 24;
  const snapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('emailDailyDigestEnabled', '==', true)
    .where('lastActivityDate', '>=', dayAgo)
    .get();
  return snapshot.docs.map((doc) => [doc.id, doc.data() as UserExternalConfig]);
};
