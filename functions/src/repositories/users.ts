import admin from 'firebase-admin';

const USERS = 'users';

interface User {
  uid: string,
};

export const findByEmail = async (email: string) : Promise<[string, User]> => {
  const userRecord = await admin.auth().getUserByEmail(email);
  return [userRecord.uid, <User> userRecord.toJSON()];
};

export const findBySlackUserId = async (slackUserId: string) : Promise<[string, User]> => {
  const db = admin.firestore();

  const querySnapshot = await db.collection(USERS)
    .where('slackUserId', '==', slackUserId)
    .limit(1)
    .get();

  if (querySnapshot.size < 1) {
    throw new Error('User not found');
  }

  const userQueryDocumentSnapshot = querySnapshot.docs[0];
  const userId = userQueryDocumentSnapshot.id;
  const userRecord = await admin.auth().getUser(userId);

  return [userId, <User> userRecord.toJSON()];
};

export const setSlackUserId = async (userId: string, slackUserId: string | null) => (
  await admin.firestore().collection(USERS).doc(userId).set({
    slackUserId,
  })
);
