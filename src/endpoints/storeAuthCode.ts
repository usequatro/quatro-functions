import * as functions from 'firebase-functions';
import { google } from 'googleapis';
import cors from 'cors';

import REGION from '../constants/region';
import { setUserInternalConfig } from '../repositories/userInternalConfigs';
import { setUserExternalConfig } from '../repositories/userExternalConfigs';

// Enable cors requests
cors({ origin: true });

const { clientid, clientsecret } = functions.config().googleapis || {};
if (!clientid) {
  throw new Error('No env var googleapis.clientid');
}
if (!clientsecret) {
  throw new Error('No env var googleapis.clientsecret');
}

const log = (message: string) => console.log(`🤐 [storeAuthCode] ${message}`);

/**
 * @link https://developers.google.com/identity/sign-in/web/server-side-flow
 */
export default functions.region(REGION).https.onCall(async (data, context) => {
  log('begin');
  // Checking that the user is authenticated.
  if (!context.auth) {
    log('no auth');
    // @link https://firebase.google.com/docs/reference/swift/firebasefunctions/api/reference/Enums/FunctionsErrorCode
    throw new functions.https.HttpsError(
      'failed-precondition',
      'The function must be called while authenticated.',
    );
  }
  if (!data.code) {
    log('No code received');
    throw new functions.https.HttpsError('invalid-argument', 'Code is missing.');
  }

  // The redirect URI must match the one used by the web client when granting offline access
  const redirectUri = 'postmessage';
  const oauth2Client = new google.auth.OAuth2(clientid, clientsecret, redirectUri);

  log(`Sending code ${data.code.substr(0, 4)}`);
  const getTokenResponse = await oauth2Client.getToken(data.code);

  const { tokens } = getTokenResponse;
  if (!tokens.refresh_token || !tokens.access_token) {
    log(`No tokens received`);
    throw new functions.https.HttpsError('internal', 'No tokens have come back.');
  }
  log(
    `Received tokens.
    refresh_token=${tokens.refresh_token.substr(0, 4)}...
    access_token=${tokens.access_token.substr(0, 4)}...`,
  );

  await setUserInternalConfig(context.auth.uid, {
    gapiRefreshToken: tokens.refresh_token,
    gapiAccessToken: tokens.access_token,
  });
  await setUserExternalConfig(context.auth.uid, {
    gapiCalendarOfflineAccess: true,
  });

  return {};
});
