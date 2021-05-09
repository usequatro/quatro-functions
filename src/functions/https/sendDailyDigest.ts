import * as functions from 'firebase-functions';
import mailgun from 'mailgun-js';

import REGION from '../../constants/region';
import composeDailyDigest from '../../utils/composeDailyDigest';

export default functions.region(REGION).https.onRequest(async (request, response) => {
  try {
    const userId: string = request.body.userId;
    const timestamp: number = request.body.timestamp || Date.now();
    if (!userId) {
      throw new Error('No userId');
    }

    functions.logger.info(`User ${userId} for timestamp ${timestamp}`);

    const {
      mailgun: { key, baseurl },
      app: { hostname },
    } = functions.config();
    if (!key) {
      throw new Error('No Mailgun configured api key');
    }
    if (!baseurl) {
      throw new Error('No Mailgun configured api base URL');
    }

    const emailDescriptor = await composeDailyDigest(userId, timestamp, baseurl, hostname);
    if (!emailDescriptor) {
      functions.logger.info(`Not sending email to user ${userId} for timestamp ${timestamp}`);
      response.send({ sent: false });
      return;
    }

    const mg = mailgun({
      apiKey: key,
      domain: baseurl,
    });

    mg.messages().send(emailDescriptor, function (error, body) {
      if (error) {
        functions.logger.error('Error sending', {
          statusCode: error.statusCode,
          message: error.message,
        });
      }
      functions.logger.debug('Mailgun send response', {
        responseMessage: body.message,
        id: body.id,
      });

      response.send({ sent: !error, emailDescriptor });
    });
  } catch (error) {
    functions.logger.error(error);
    response.status(412).send({ error: error.toString() });
  }
});
