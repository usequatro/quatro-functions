import * as functions from 'firebase-functions';
import cors from 'cors';
import Mixpanel from 'mixpanel';

import REGION from '../../constants/region';
import getUserIdFromToken from '../../utils/getUserIdFromToken';

cors({ origin: true });

/**
 * Unique link for all environments
 * @link https://app.todesktop.com/apps/210720bke7ubhqt
 */
const DESKTOP_APP_DOWNLOAD_URL = 'https://dl.todesktop.com/210720bke7ubhqt';

export default functions.region(REGION).https.onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    return response.status(405).end();
  }

  let userId = null;
  const idToken = request.query.id_token as string | undefined;
  try {
    userId = await getUserIdFromToken(idToken);
  } catch (error) {
    functions.logger.error('Failed verifying passed ID token', {
      idToken,
      errorMessage: error.message,
    });
    return response.status(401).end();
  }

  const mixpanel = Mixpanel.init(functions.config().mixpanel.token);

  mixpanel.track('Desktop Client App Downloaded', {
    distinct_id: userId || null,
  });

  return response.redirect(302, DESKTOP_APP_DOWNLOAD_URL);
});
