import admin from 'firebase-admin';

import { USER_INTERNAL_CONFIGS } from '../constants/collections';
import { UserInternalConfig } from '../schemas/userInternalConfig';

export const getUserInternalConfig = async (
  userId: string,
): Promise<UserInternalConfig | undefined> => {
  const snapshot = await admin.firestore().collection(USER_INTERNAL_CONFIGS).doc(userId).get();
  return snapshot.exists ? (snapshot.data() as UserInternalConfig) : undefined;
};

type WriteResult = admin.firestore.WriteResult;

export const setUserInternalConfig = async (
  userId: string,
  payload: Partial<UserInternalConfig>,
): Promise<WriteResult> =>
  admin.firestore().collection(USER_INTERNAL_CONFIGS).doc(userId).set(payload, { merge: true });

export const deleteUserInternalConfig = async (userId: string): Promise<WriteResult> =>
  admin.firestore().collection(USER_INTERNAL_CONFIGS).doc(userId).delete();
