import admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { CalendarProviders } from '../constants/calendarProviders';

import { calendarSchema, Calendar } from '../schemas/calendar';

export const COLLECTION = 'calendars';

export type FirestoreSnapshot = admin.firestore.QuerySnapshot<admin.firestore.DocumentData>;

export const findCalendarsByUserId = async (userId: string): Promise<[string, Calendar][]> => {
  const snapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .get();
  return snapshot.docs.map((doc) => [doc.id, doc.data() as Calendar]);
};

export const getCalendarById = async (id: string): Promise<[string, Calendar] | undefined> => {
  const document = await admin.firestore().collection(COLLECTION).doc(id).get();
  return document.exists ? [document.id, document.data() as Calendar] : undefined;
};

export const findCalendarByWatcher = async (
  watcherChannelId: string,
  watcherResourceId: string,
): Promise<[string, Calendar] | undefined> => {
  const querySnapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('watcherChannelId', '==', watcherChannelId)
    .where('watcherResourceId', '==', watcherResourceId)
    .limit(1)
    .get();

  return querySnapshot.empty
    ? undefined
    : [querySnapshot.docs[0].id, querySnapshot.docs[0].data() as Calendar];
};

export const findUserCalendarsCount = async (userId: string): Promise<number> => {
  const calendars = await findCalendarsByUserId(userId);
  return calendars.length;
};

export const updateCalendar = async (
  id: string,
  payload: Partial<Calendar>,
): Promise<admin.firestore.WriteResult> => {
  const validPayload = await calendarSchema.validateAsync(payload, {
    stripUnknown: true,
    noDefaults: true,
  });
  return admin.firestore().collection(COLLECTION).doc(id).update(validPayload);
};

export const findCalendarsWithExpiringGoogleCalendarChannel = async (
  threshold: number,
): Promise<Array<[string, Calendar]>> => {
  const targetWatcherExpiration = Date.now() + threshold;
  const querySnapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('provider', '==', CalendarProviders.Google)
    .where('watcherExpiration', '<=', targetWatcherExpiration)
    .limit(500) // insane limit
    .get();
  if (querySnapshot.size >= 500) {
    functions.logger.warn('Limit in findCalendarsWithExpiringGoogleCalendarChannel reached', {
      size: querySnapshot.size,
      threshold,
      condition: `watcherExpiration <= ${targetWatcherExpiration}`,
    });
  }
  return querySnapshot.docs.map((doc) => [doc.id, doc.data() as Calendar]);
};

export const deleteCalendar = (id: string): Promise<FirebaseFirestore.WriteResult> =>
  admin.firestore().collection(COLLECTION).doc(id).delete();
