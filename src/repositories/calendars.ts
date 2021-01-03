import admin from 'firebase-admin';

import { CALENDARS } from '../constants/collections';
import { CalendarDocument } from '../types';

export type FirestoreSnapshot = admin.firestore.QuerySnapshot<admin.firestore.DocumentData>;

export const getCalendarsByUserId = (userId: string): Promise<FirestoreSnapshot> =>
  admin.firestore().collection(CALENDARS).where(userId, '==', userId).get();

export const getCalendarById = async (
  id: string,
): Promise<[string, CalendarDocument] | undefined> => {
  const document = await admin.firestore().collection(CALENDARS).doc(id).get();
  return document.exists ? [document.id, document.data() as CalendarDocument] : undefined;
};

export const getUserCalendarsCount = async (userId: string): Promise<number> => {
  const calendars = await getCalendarsByUserId(userId);
  return calendars.docs.length;
};
