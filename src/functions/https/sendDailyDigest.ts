import * as functions from 'firebase-functions';
import mailgun from 'mailgun-js';

import REGION from '../../constants/region';
import composeDailyDigest from '../../utils/composeDailyDigest';

/**
 * Just for development purposes to test sending the digest email intentionally
 *
 * @example
    curl -i \
      -d '{"userId":"8H0RnjkYAfQoqqNQdHfrZH8AaOj2"}' \
      -H "Content-Type: application/json" \
      -X POST https://us-central1-tasket-project.cloudfunctions.net/sendDailyDigest
 */
export default functions.region(REGION).https.onRequest(async (request, response) => {
  try {
    const userId: string = request.body.userId;
    const timestamp: number = request.body.timestamp || Date.now();
    if (!userId) {
      throw new Error('No userId');
    }

    // Some hardcoded protections to ensure this route is only used for development
    const allowedUserIds = [
      '8H0RnjkYAfQoqqNQdHfrZH8AaOj2', // guillermo splash prod
      'f5VYmFZMsIYjjzJulNrIICntuZm1', // g.puente.allott@gmail.com dev
      '2ZVQ9sSQx6YT1EF7wF3RBoYwdEj2', // g.puente.allott+connected@gmail.com dev
    ];
    if (!allowedUserIds.includes(userId)) {
      throw new Error(`Invalid user ID ${userId}`);
    }

    functions.logger.info(`User ${userId} for timestamp ${timestamp}`);

    const {
      mailgun: { key, domain },
      app: { hostname },
    } = functions.config();
    if (!key) {
      throw new Error('No Mailgun configured API key');
    }
    if (!domain) {
      throw new Error('No Mailgun configured API domain');
    }

    const emailDescriptor = await composeDailyDigest(userId, timestamp, domain, hostname);
    if (!emailDescriptor) {
      functions.logger.info(`Not sending email to user ${userId} for timestamp ${timestamp}`);
      response.send({ sent: false });
      return;
    }

    const mg = mailgun({
      apiKey: key,
      domain: domain,
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
