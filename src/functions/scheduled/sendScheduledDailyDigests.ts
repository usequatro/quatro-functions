import * as functions from 'firebase-functions';
import { utcToZonedTime } from 'date-fns-tz';
import startOfDay from 'date-fns/startOfDay';
import isBefore from 'date-fns/isBefore';
import format from 'date-fns/format';
import mailgun from 'mailgun-js';

import { findUserExternalConfigWithEmailDailyDigestEnabled } from '../../repositories/userExternalConfigs';
import composeDailyDigest from '../../utils/composeDailyDigest';

const DAILY_DIGEST_HOUR = 20; // 8pm

/**
 * @link https://firebase.google.com/docs/functions/schedule-functions
 */
export default functions.pubsub
  .schedule('* * * * *') // https://crontab.guru/every-hour
  .onRun(async () => {
    const nowUtc = Date.now();
    const configs = await findUserExternalConfigWithEmailDailyDigestEnabled();

    let sentCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const [userId, userExternalConfig] of configs) {
      try {
        const { timeZone, lastActivityDate } = userExternalConfig;
        if (!timeZone) {
          throw new Error(`Unexpected lack of userExternalConfig.timeZone for user ${userId}`);
        }
        if (!lastActivityDate) {
          functions.logger.debug(`Skipping because no last activity date for user ${userId}`);
          skippedCount++;
          continue;
        }

        const zonedNowTime = utcToZonedTime(nowUtc, timeZone);

        const zonedLastActivityDate = utcToZonedTime(lastActivityDate, timeZone);
        const wasActiveRecently = isBefore(startOfDay(zonedNowTime), zonedLastActivityDate);
        const formattedLastActivityDate = format(zonedLastActivityDate, 'yyyy-MM-dd HH:mm:ss');

        if (!wasActiveRecently) {
          functions.logger.debug(
            `Skipping because no recent activity for ${userId}. Last was on ${formattedLastActivityDate}`,
            { zonedNowTime, zonedLastActivityDate, lastActivityDate },
          );
          skippedCount++;
          continue;
        }

        const isDailyDigestTime = zonedNowTime.getHours() === DAILY_DIGEST_HOUR;

        if (!isDailyDigestTime) {
          functions.logger.debug(
            `Not daily digest time for user ${userId}. It's ${zonedNowTime.getHours()}h for them now.`,
            { formattedLastActivityDate },
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
          functions.logger.debug(
            `Skipping sending email to user ${userId} for timestamp ${nowUtc}`,
            { formattedLastActivityDate },
          );
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
              formattedLastActivityDate,
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
