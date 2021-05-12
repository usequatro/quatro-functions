import admin from 'firebase-admin';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import startOfDay from 'date-fns/startOfDay';
import endOfDay from 'date-fns/endOfDay';
import addHours from 'date-fns/addHours';
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
  'h:Reply-To'?: string;
  'h:X-Mailgun-Variables'?: string;
};

// @link Source control: https://github.com/usequatro/quatro-emails/blob/main/daily-digest-v0.html
// @link Sandbox: https://app.mailgun.com/app/sending/domains/sandbox518dcce223b249e484f057279e53092e.mailgun.org/templates/details/daily-digest-v0
// @link Prod: https://app.mailgun.com/app/sending/domains/mail.usequatro.com/templates/details/daily-digest-v0
const DAILY_DIGEST_TEMPLATE = 'daily-digest-v0';

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

  const dateInLocalTimeZone = utcToZonedTime(date, timeZone);

  const beginingOfLocalDay = startOfDay(dateInLocalTimeZone).getTime();
  const endOfLocalDay = endOfDay(dateInLocalTimeZone).getTime();
  const completedTasks = await findCompletedTasksByUserIdInRange(
    userId,
    beginingOfLocalDay,
    endOfLocalDay,
  );

  const tomorrowMorning = addHours(endOfDay(dateInLocalTimeZone), 9);
  const tomorrowMorningUtc = zonedTimeToUtc(tomorrowMorning, timeZone).getTime();
  const topTasks = await findTopTasksForUserForDate(userId, tomorrowMorningUtc);

  if (!completedTasks.length && !topTasks.length) {
    return null;
  }
  const userRecord = await admin.auth().getUser(userId);
  if (!userRecord.email) {
    throw new Error('User has no email');
  }

  return {
    to: userRecord.email,
    from: `Quatro <no-reply@${senderDomain}>`,
    subject: `[Quatro] Your daily digest of ${format(date, 'PP')}`,
    template: DAILY_DIGEST_TEMPLATE,
    'h:Reply-To': 'contact@usequatro.com',
    'h:X-Mailgun-Variables': JSON.stringify({
      appUrl: `https://${appHostname}`,
      unsubscribeUrl: `https://${appHostname}/account`,
      userDisplayName: userRecord.displayName,
      formattedDate: format(date, 'PP'),
      completedTasks: completedTasks.map(([id, task]) => ({
        id,
        title: task.title,
        formattedCompletedDate: task.completed ? format(task.completed, 'PP, p') : null,
      })),
      topFourTasks: topTasks.map(([id, task]) => ({
        editTaskUrl: `https://${appHostname}/task/${id}`,
        title: task.title,
        formattedDueDate: task.due ? format(task.due, 'PP, p') : '',
        formattedScheduledStartDate: task.scheduledStart
          ? format(task.scheduledStart, 'PP, p')
          : '',
      })),
    }),
  };
}
