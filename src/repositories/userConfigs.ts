import admin from 'firebase-admin';

import { USER_CONFIGS } from '../constants/collections';
import { UserConfig } from '../schemas/userConfig';

export const getUserConfig = async (userId: string): Promise<UserConfig> => {
  const snapshot = await admin.firestore().collection(USER_CONFIGS).doc(userId).get();
  return snapshot.data() as UserConfig;
};
