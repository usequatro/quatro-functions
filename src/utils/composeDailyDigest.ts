import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import startOfDay from 'date-fns/startOfDay';
import endOfDay from 'date-fns/endOfDay';
import add from 'date-fns/add';
import format from 'date-fns/format';
import { getUserExternalConfig } from '../repositories/userExternalConfigs';
import {
  findCompletedTasksByUserIdInRange,
  findTopTasksForUserForDate,
} from '../repositories/tasks';

type EmailDescriptor = {
  to: string;
  from: string;
  subject: string;
  html?: string;
  template?: string;
  'h:Reply-To': string;
  'h:X-Mailgun-Variables': string;
};

// @link Source control: https://github.com/usequatro/quatro-emails/blob/main/daily-digest-v0.html
// @link Sandbox: https://app.mailgun.com/app/sending/domains/sandbox518dcce223b249e484f057279e53092e.mailgun.org/templates/details/daily-digest-v0
// @link Prod: https://app.mailgun.com/app/sending/domains/mail.usequatro.com/templates/details/daily-digest-v0
const DAILY_DIGEST_TEMPLATE = 'daily-digest-v0';

const REPLY_TO_ADDRESS = 'contact@usequatro.com';

export default async function composeDailyDigest(
  userId: string,
  date: number,
  senderDomain: string,
  appHostname: string,
): Promise<EmailDescriptor | null> {
  const userExternalConfig = await getUserExternalConfig(userId);
  if (!userExternalConfig) {
    throw new Error('No userExternalConfig');
  }
  const { timeZone } = userExternalConfig;
  if (!timeZone) {
    throw new Error('No userExternalConfig.timeZone');
  }

  const { email, displayName: userDisplayName, emailVerified } = await admin.auth().getUser(userId);
  if (!email) {
    throw new Error('User has no email');
  }
  if (!emailVerified) {
    functions.logger.debug(`Skipping because email address isn't verified ${userId} (${email})`);
    return null;
  }

  const dateInLocalTimeZone = utcToZonedTime(date, timeZone);

  const beginingOfLocalDay = startOfDay(dateInLocalTimeZone).getTime();
  const endOfLocalDay = endOfDay(dateInLocalTimeZone).getTime();
  const completedTasks = await findCompletedTasksByUserIdInRange(
    userId,
    beginingOfLocalDay,
    endOfLocalDay,
  );

  const tomorrowEndOfWorkDay = add(startOfDay(dateInLocalTimeZone), { days: 1, hours: 20 });
  const tomorrowEndOfWorkDayUtc = zonedTimeToUtc(tomorrowEndOfWorkDay, timeZone).getTime();
  const topTasks = await findTopTasksForUserForDate(userId, tomorrowEndOfWorkDayUtc);

  if (!completedTasks.length && !topTasks.length) {
    functions.logger.debug(
      `Skipping because no tasks to report for user ${userId} for timestamp ${date}`,
    );
    return null;
  }

  return {
    to: email,
    from: `Quatro <no-reply@${senderDomain}>`,
    subject: `[Quatro] Your daily digest of ${format(utcToZonedTime(date, timeZone), 'PP')}`,
    template: DAILY_DIGEST_TEMPLATE,
    'h:Reply-To': REPLY_TO_ADDRESS,
    // the keys below are used as Handlebars variables in the Mailgun email template
    'h:X-Mailgun-Variables': JSON.stringify({
      appUrl: `https://${appHostname}`,
      unsubscribeUrl: `https://${appHostname}/account`,
      userDisplayName,
      formattedDate: format(utcToZonedTime(date, timeZone), 'PP'),
      completedTasks: completedTasks.map(([id, task]) => ({
        id,
        title: task.title,
        formattedCompletedDate: task.completed
          ? format(utcToZonedTime(task.completed, timeZone), 'PP, p')
          : null,
      })),
      topFourTasks: topTasks.map(([id, task]) => ({
        editTaskUrl: `https://${appHostname}/task/${id}`,
        title: task.title,
        formattedDueDate: task.due ? format(utcToZonedTime(task.due, timeZone), 'PP, p') : '',
        formattedScheduledStartDate: task.scheduledStart
          ? format(utcToZonedTime(task.scheduledStart, timeZone), 'PP, p')
          : '',
      })),
    }),
  };
}
