import admin from 'firebase-admin';

import { CALENDARS } from '../constants/collections';

export type FirestoreSnapshot = admin.firestore.QuerySnapshot<admin.firestore.DocumentData>;

export const getCalendarsByUserId = (userId: string): Promise<FirestoreSnapshot> =>
  admin.firestore().collection(CALENDARS).where(userId, '==', userId).get();

export const getUserCalendarsCount = async (userId: string): Promise<number> => {
  const calendars = await getCalendarsByUserId(userId);
  return calendars.docs.length;
};
