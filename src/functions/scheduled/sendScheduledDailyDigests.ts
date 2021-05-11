import * as functions from 'firebase-functions';
import { utcToZonedTime } from 'date-fns-tz';
import mailgun from 'mailgun-js';

import { findUserExternalConfigWithEmailDailyDigestEnabled } from '../../repositories/userExternalConfigs';
import composeDailyDigest from '../../utils/composeDailyDigest';

const DAILY_DIGEST_HOUR = 20; // 8pm

/**
 * @link https://firebase.google.com/docs/functions/schedule-functions
 */
export default functions.pubsub
  .schedule('0 * * * *') // https://crontab.guru/every-hour
  .onRun(async () => {
    const nowUtc = Date.now();
    const configs = await findUserExternalConfigWithEmailDailyDigestEnabled();

    let sentCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const [userId, userExternalConfig] of configs) {
      try {
        const { timeZone } = userExternalConfig;
        if (!timeZone) {
          throw new Error(`Unexpected lack of userExternalConfig.timeZone for user ${userId}`);
        }

        const zonedTime = utcToZonedTime(nowUtc, timeZone);
        const isDailyDigestTime = zonedTime.getHours() === DAILY_DIGEST_HOUR;

        if (!isDailyDigestTime) {
          functions.logger.debug(
            `Not daily digest time for user ${userId}. It's ${zonedTime.getHours()}h for them now`,
          );
          skippedCount++;
          continue;
        }

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

        const mg = mailgun({
          apiKey: key,
          domain: domain,
        });

        const emailDescriptor = await composeDailyDigest(userId, nowUtc, domain, hostname);
        if (!emailDescriptor) {
          functions.logger.debug(`Skipping sending email to user ${userId} for timestamp ${nowUtc}`);
          skippedCount++;
          continue;
        }

        await new Promise((resolve, reject) => {
          mg.messages().send(emailDescriptor, function (error, body) {
            if (error) {
              return reject(error.message);
            }
            functions.logger.debug('Mailgun send response', {
              responseMessage: body.message,
              id: body.id,
            });
            sentCount++;
            resolve(undefined);
          });
        });
      } catch (error) {
        errorCount++;
        functions.logger.error(error);
      }
    }

    functions.logger.info(
      `Processed ${configs.length} user external configs with daily digest enabled, sent=${sentCount} error=${errorCount} skipped=${skippedCount}`,
    );
  });
