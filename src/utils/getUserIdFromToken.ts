import admin from 'firebase-admin';

/**
 * @throws Error when passed ID token can't be verified
 * @param idToken
 * @returns {Promise<string | null>}
 */
export default async function getUserIdFromToken(idToken = ''): Promise<string | null> {
  if (!idToken) {
    return null;
  }
  if (typeof idToken !== 'string') {
    throw new Error(`Invalid idToken type ${typeof idToken}`);
  }
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken.uid;
}
