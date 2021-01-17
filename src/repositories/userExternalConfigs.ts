import admin from 'firebase-admin';

import { UserExternalConfig, userExternalConfigSchema } from '../schemas/userExternalConfig';

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
