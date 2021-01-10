import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

import REGION from '../constants/region';

/**
 * @link https://developers.google.com/identity/sign-in/web/server-side-flow
 */
export default functions.region(REGION).https.onCall(async (data, context) => {
  // Checking that the user is authenticated.
  if (!context.auth) {
    functions.logger.error('No user authenticated');
    // @link https://firebase.google.com/docs/reference/swift/firebasefunctions/api/reference/Enums/FunctionsErrorCode
    throw new functions.https.HttpsError(
      'failed-precondition',
      'The function must be called while authenticated.',
    );
  }
  if (!data.unlinkedProviderId) {
    functions.logger.error('No unlinkedProviderId received', { userId: context.auth.uid });
    throw new functions.https.HttpsError('invalid-argument', 'unlinkedProviderId is missing.');
  }

  const firebaseUser = await admin.auth().getUser(context.auth.uid);
  const unlinkedProvider = firebaseUser.providerData.find(
    (provider) => provider.providerId === data.unlinkedProviderId,
  );

  if (unlinkedProvider) {
    functions.logger.error('Unexpectedly provider is still pressent', {
      userId: context.auth.uid,
      unlinkedProviderId: data.unlinkedProviderId,
      unlinkedProviderFound: unlinkedProvider,
    });
    throw new Error('Unexpectedly provider is still pressent');
  }

  switch (data.unlinkedProviderId) {
    case 'google.com': {
      // @todo: Remove calendars & cancel their watchers
      // @todo: Remove tag from Active Campaign
      break;
    }
    default: {
      functions.logger.warn('Uknown provider unlinked', {
        userId: context.auth.uid,
        unlinkedProviderId: data.unlinkedProviderId,
      });
    }
  }

  return {};
});
