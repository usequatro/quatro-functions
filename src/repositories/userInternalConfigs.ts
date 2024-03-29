import admin from 'firebase-admin';

import { userInternalConfigSchema } from '../schemas/userInternalConfig';
import { UserInternalConfig } from '../types/userInternalConfig';

const COLLECTION = 'userInternalConfigs';

export const getUserInternalConfig = async (
  userId: string,
): Promise<UserInternalConfig | undefined> => {
  const snapshot = await admin.firestore().collection(COLLECTION).doc(userId).get();
  return snapshot.exists ? (snapshot.data() as UserInternalConfig) : undefined;
};

type WriteResult = admin.firestore.WriteResult;

export const setUserInternalConfig = async (
  userId: string,
  payload: Partial<UserInternalConfig>,
): Promise<WriteResult> => {
  const validatedPayload = await userInternalConfigSchema.validateAsync(payload, {
    stripUnknown: true,
    noDefaults: true,
  });
  return admin
    .firestore()
    .collection(COLLECTION)
    .doc(userId)
    .set(validatedPayload, { merge: true });
};

export const updateUserInternalConfig = async (
  userId: string,
  payload: Partial<UserInternalConfig>,
): Promise<WriteResult> => {
  const validatedPayload = await userInternalConfigSchema.validateAsync(payload, {
    stripUnknown: true,
    noDefaults: true,
  });
  return admin.firestore().collection(COLLECTION).doc(userId).update(validatedPayload);
};

export const deleteUserInternalConfig = async (userId: string): Promise<WriteResult> =>
  admin.firestore().collection(COLLECTION).doc(userId).delete();
