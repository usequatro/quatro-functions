import admin from 'firebase-admin';

import { USER_CONFIGS } from '../constants/collections';
import { UserConfig } from '../schemas/userConfig';

export const getUserConfig = async (userId: string): Promise<UserConfig | undefined> => {
  const snapshot = await admin.firestore().collection(USER_CONFIGS).doc(userId).get();
  return snapshot.exists ? snapshot.data() as UserConfig : undefined;
};

type WriteResult = admin.firestore.WriteResult;

export const updateUserConfig = async (
  userId: string,
  payload: Partial<UserConfig>,
): Promise<WriteResult> => admin.firestore().collection(USER_CONFIGS).doc(userId).update(payload);

export const deleteUserConfig = async (userId: string): Promise<WriteResult> =>
  admin.firestore().collection(USER_CONFIGS).doc(userId).delete();
