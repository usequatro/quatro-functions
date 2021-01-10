import * as functions from 'firebase-functions';
import { google, Auth } from 'googleapis';
import { getUserInternalConfig, setUserInternalConfig } from '../repositories/userInternalConfigs';

const { clientid, clientsecret } = functions.config().googleapis || {};
if (!clientid) {
  throw new Error('No env var googleapis.clientid');
}
if (!clientsecret) {
  throw new Error('No env var googleapis.clientsecret');
}

/**
 * Returns an OAuth2Client that can be used to make requests to Google APIs on behalf of a user that
 * granted offline access.
 *
 * It requires users to have granted access previously and for their refresh token to be saved.
 *
 * @throws Error when user doesn't have Google Calendar refresh token
 */
export default async function createGoogleAuth(userId: string): Promise<Auth.OAuth2Client> {
  // The redirect URI must match the one used by the web client when granting offline access
  const redirectUri = 'postmessage';

  // Initialize auth client
  const oauth2Client = new google.auth.OAuth2(clientid, clientsecret, redirectUri);

  // Pull saved tokens for backend usage
  const { gapiAccessToken, gapiRefreshToken } = (await getUserInternalConfig(userId)) || {};

  if (!gapiAccessToken) {
    throw new Error(`User ${userId} doesn't have refresh token for Google Calendar offline access`);
  }

  // Add them to the client, so we can perform requests on behalf of the user
  oauth2Client.setCredentials({
    access_token: gapiAccessToken || '',
    refresh_token: gapiRefreshToken,
  });

  // Listen to token changes so we can keep the access token up to date
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      // store the refresh_token in my database
      functions.logger.info('Google APIs refresh token changed', {
        userId,
        newRefreshToken: `${tokens.refresh_token.substr(0, 4)}...`,
      });
      setUserInternalConfig(userId, { gapiRefreshToken: tokens.refresh_token });
    }
    if (tokens.access_token) {
      functions.logger.info('Google APIs access token changed', {
        userId,
        newAccessToken: `${tokens.access_token.substr(0, 4)}...`,
      });
      setUserInternalConfig(userId, { gapiAccessToken: tokens.access_token });
    }
  });

  return oauth2Client;
}
