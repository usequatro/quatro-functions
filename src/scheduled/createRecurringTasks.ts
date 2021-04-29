/**
 * Functionality to create task instances for recurring configurations.
 */

import * as functions from 'firebase-functions';
import Mixpanel from 'mixpanel';
import differenceInCalendarWeeks from 'date-fns/differenceInCalendarWeeks';
import differenceInCalendarMonths from 'date-fns/differenceInCalendarMonths';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import addMonths from 'date-fns/addMonths';
import addDays from 'date-fns/addDays';
import isSameDay from 'date-fns/isSameDay';
import getYear from 'date-fns/getYear';
import setDayOfYear from 'date-fns/setDayOfYear';
import getDayOfYear from 'date-fns/getDayOfYear';
import getDate from 'date-fns/getDate';
import isMonday from 'date-fns/isMonday';
import isTuesday from 'date-fns/isTuesday';
import isWednesday from 'date-fns/isWednesday';
import isThursday from 'date-fns/isThursday';
import isFriday from 'date-fns/isFriday';
import isSaturday from 'date-fns/isSaturday';
import isSunday from 'date-fns/isSunday';
import isAfter from 'date-fns/isAfter';
import setYear from 'date-fns/setYear';
import set from 'date-fns/set';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { findAll, update as updateRecurringConfig } from '../repositories/recurringConfigs';
import { findById, create } from '../repositories/tasks';
import { getUserExternalConfig } from '../repositories/userExternalConfigs';
import { Task } from '../types/task';
import { RecurringConfig, DurationUnits, DaysOfWeek } from '../types/recurringConfig';
import { TaskSources } from '../types';

const TIME_FORMAT = 'HH:mm';

export const appliesToDate = (recurringConfig: RecurringConfig, date: number): boolean => {
  const { unit, amount, activeWeekdays, referenceDate } = recurringConfig;

  if (!unit) {
    throw new Error('Missing unit value');
  }
  if (!amount) {
    throw new Error('Missing amount value');
  }
  if (!referenceDate) {
    throw new Error('Missing referenceDate value');
  }

  switch (unit) {
    case DurationUnits.Day: {
      const dayDifference = differenceInCalendarDays(date, referenceDate);
      return dayDifference % amount === 0;
    }
    case DurationUnits.Week: {
      if (!activeWeekdays) {
        throw new Error('Missing activeWeekdays value for weekly recurrence');
      }
      const weekDifference = differenceInCalendarWeeks(date, referenceDate, { weekStartsOn: 1 });
      const fulfillsSeparationAmount = weekDifference % amount === 0;

      if (!fulfillsSeparationAmount) {
        return false;
      }

      return (
        (isMonday(date) && activeWeekdays[DaysOfWeek.Monday]) ||
        (isTuesday(date) && activeWeekdays[DaysOfWeek.Tuesday]) ||
        (isWednesday(date) && activeWeekdays[DaysOfWeek.Wednesday]) ||
        (isThursday(date) && activeWeekdays[DaysOfWeek.Thursday]) ||
        (isFriday(date) && activeWeekdays[DaysOfWeek.Friday]) ||
        (isSaturday(date) && activeWeekdays[DaysOfWeek.Saturday]) ||
        (isSunday(date) && activeWeekdays[DaysOfWeek.Sunday])
      );
    }
    case DurationUnits.Month: {
      const calendarMonthDifference = differenceInCalendarMonths(date, referenceDate);
      const fulfillsSeparationAmount = calendarMonthDifference % amount === 0;

      if (!fulfillsSeparationAmount) {
        return false;
      }

      // addMonths() is great because it'll cap at the latest day of month if overflowing the days
      const applicableDateInThisMonth = addMonths(referenceDate, calendarMonthDifference);
      if (getDate(date) !== getDate(applicableDateInThisMonth)) {
        return false;
      }

      // If today is the day, make sure we trigger this after the time
      return isAfter(date, applicableDateInThisMonth);
    }
    default:
      throw new Error(`Unknown unit value "${unit}"`);
  }
};

const alreadyCheckedOnDate = (recurringConfig: RecurringConfig, date: number) =>
  Boolean(recurringConfig.lastRunDate && isSameDay(date, recurringConfig.lastRunDate));

const setTimeInDay = (date: number | Date, time: string, timeZone: string) => {
  const timedDate = parse(time, TIME_FORMAT, date);
  const timedDateUtc = zonedTimeToUtc(timedDate, timeZone);
  const timedDateUtcSharp = set(timedDateUtc, { seconds: 0, milliseconds: 0 });
  return timedDateUtcSharp.getTime();
};

export const getNewScheduledStart = (oldScheduledStart: number, now: number): number => {
  const scheduledStartSetToToday = setDayOfYear(oldScheduledStart, getDayOfYear(now));
  const newScheduledStartDate = setYear(scheduledStartSetToToday, getYear(now));
  return newScheduledStartDate.getTime();
};

const getTimeZone = async (recurringConfig: RecurringConfig) => {
  const userExternalConfig = await getUserExternalConfig(recurringConfig.userId);
  if (!userExternalConfig) {
    throw new Error('Unable to migrate because missing user external config');
  }
  const { timeZone } = userExternalConfig;
  if (!timeZone) {
    throw new Error('Unable to migrate because missing time zone');
  }
  return timeZone;
};

export const migrateRecurringConfig = async (
  recurringConfig: RecurringConfig,
  timeZone: string,
): Promise<RecurringConfig> => {
  const task = await findById(recurringConfig.mostRecentTaskId);
  if (!task) {
    throw new Error('Unable to migrate because missing task');
  }

  const migratedRecurringConfig = { ...recurringConfig };

  if (migratedRecurringConfig.referenceDate == null) {
    if (!task.scheduledStart) {
      throw new Error('Unable to migrate because missing scheduled start');
    }
    migratedRecurringConfig.referenceDate = task.scheduledStart;
  }

  if (migratedRecurringConfig.taskDetails == null) {
    migratedRecurringConfig.taskDetails = {
      title: task.title,
      description: task.description,
      effort: task.effort,
      impact: task.impact,
      scheduledTime: format(
        utcToZonedTime(migratedRecurringConfig.referenceDate, timeZone),
        TIME_FORMAT,
      ),
      dueOffsetDays: task.due
        ? differenceInCalendarDays(task.due, migratedRecurringConfig.referenceDate)
        : null,
      dueTime: task.due ? format(utcToZonedTime(task.due, timeZone), TIME_FORMAT) : null,
    };
  }

  return migratedRecurringConfig;
};

class Counter {
  value: number;
  constructor() {
    this.value = 0;
  }
  increment() {
    this.value += 1;
  }
}

/**
 * Scheduled task for creating recurring tasks
 * Note that this functionality uses Google Cloud Pub/Sub topic and Google Cloud Scheduler, separate
 * APIs that also need to be enabled.
 * @link https://firebase.google.com/docs/functions/schedule-functions
 * @link https://crontab.guru/
 */
export default functions.pubsub
  .schedule('* * * * *') // https://crontab.guru/every-minute
  .onRun(async () => {
    // @todo: when there are many recurring configs, and the findAll exclude recurring tasks already processed recently
    // For that, we'll need to populate lastRunDate with a null value in all of them
    const recurringConfigsResult = await findAll();
    const now = Date.now();

    const configsExcludedAlreadyRun = recurringConfigsResult.filter(
      ([, recurringConfig]) => !alreadyCheckedOnDate(recurringConfig, now),
    );

    const alreadyCheckedOnDateCount =
      recurringConfigsResult.length - configsExcludedAlreadyRun.length;
    const totalCounter = new Counter();
    const errorCounter = new Counter();
    const skippedCounter = new Counter();
    const createdCounter = new Counter();

    // @todo: remove the '_' and the code to migrate once all recurring configs are migrated
    for (const [rcId, _recurringConfig] of configsExcludedAlreadyRun) {
      totalCounter.increment();

      try {
        const timeZone = await getTimeZone(_recurringConfig);

        let recurringConfig = _recurringConfig;
        if (!_recurringConfig.referenceDate || !_recurringConfig.taskDetails) {
          recurringConfig = await migrateRecurringConfig(_recurringConfig, timeZone);
          functions.logger.debug(`Migrated recurring config ${rcId}`, {
            original: _recurringConfig,
            migrated: recurringConfig,
          });
        }

        if (!appliesToDate(recurringConfig, now)) {
          functions.logger.debug(`Skipping ${rcId} because not applicable`, { recurringConfig });

          skippedCounter.increment();
          continue;
        }

        const mostRecentTask = await findById(recurringConfig.mostRecentTaskId);

        // if it applies, but the last task is incomplete, we don't create the task for today
        if (mostRecentTask && !mostRecentTask.completed) {
          // If the time to create this task already passed, we flag the config as run today so we won't
          // create the task instance today even if the last one is completed.
          if (setTimeInDay(now, recurringConfig.taskDetails.scheduledTime, timeZone) < now) {
            functions.logger.debug(
              `Skipping ${rcId} because last task is still incomplete. Marking as run today because scheduled time is past`,
              { recurringConfig },
            );

            await updateRecurringConfig(rcId, { lastRunDate: now });
          } else {
            functions.logger.debug(`Skipping ${rcId} because last task is still incomplete`, {
              recurringConfig,
            });
          }
          skippedCounter.increment();
          continue;
        }

        // If a recurring task was already created today, we skip it as we dont' want to create 2 instances for the same day
        if (
          mostRecentTask &&
          mostRecentTask.source === TaskSources.RecurringConfig &&
          mostRecentTask.created &&
          isSameDay(mostRecentTask.created, now)
        ) {
          functions.logger.debug(
            `Skipping ${rcId} recurring instance was already created today ${recurringConfig.mostRecentTaskId}`,
            { recurringConfig, mostRecentTask },
          );

          await updateRecurringConfig(rcId, { lastRunDate: now });
          skippedCounter.increment();
          continue;
        }

        const newScheduledStart = setTimeInDay(
          now,
          recurringConfig.taskDetails.scheduledTime,
          timeZone,
        );
        const newDue =
          recurringConfig.taskDetails.dueOffsetDays != null && recurringConfig.taskDetails.dueTime
            ? setTimeInDay(
                addDays(newScheduledStart, recurringConfig.taskDetails.dueOffsetDays),
                recurringConfig.taskDetails.dueTime,
                timeZone,
              )
            : null;

        const newTask: Partial<Task> = {
          title: recurringConfig.taskDetails.title,
          description: recurringConfig.taskDetails.description,
          effort: recurringConfig.taskDetails.effort,
          impact: recurringConfig.taskDetails.impact,
          scheduledStart: newScheduledStart,
          due: newDue,
          completed: null,
          snoozedUntil: null,
          recurringConfigId: rcId,
          source: TaskSources.RecurringConfig,
        };
        const newTaskId = await create(recurringConfig.userId, newTask);
        createdCounter.increment();

        await updateRecurringConfig(rcId, {
          // update lastRunDate so that we don't create duplicates for the same day
          lastRunDate: now,
          // update taskId so that future tasks are cloned from latest one
          mostRecentTaskId: newTaskId,
        });

        functions.logger.info(`Created recurring task ${newTaskId} for config ${rcId}`, {
          recurringConfig,
          newTask,
        });

        const mixpanel = Mixpanel.init(functions.config().mixpanel.token);
        mixpanel.track('Repeating Task Created', {
          hasScheduledStart: Boolean(newTask.scheduledStart),
          hasSnoozedUntil: Boolean(newTask.snoozedUntil),
          hasDueDate: Boolean(newTask.due),
          hasDescription: Boolean(newTask.description),
          isRecurring: true,
          hasBlockers: false,
          hasCalendarBlock: false,
          impact: newTask.impact,
          effort: newTask.effort,
          timeZone,
          scheduledTime: recurringConfig.taskDetails.scheduledTime,
          dueOffsetDays: recurringConfig.taskDetails.dueOffsetDays,
          dueTime: recurringConfig.taskDetails.dueTime,
          unit: recurringConfig.unit,
          amount: recurringConfig.amount,
        });
      } catch (error) {
        functions.logger.error(error, {
          rcId,
          _recurringConfig,
        });
        errorCounter.increment();
      }
    }

    functions.logger.info(
      `Recurring tasks processed. total=${totalCounter.value} created=${createdCounter.value} skipped=${skippedCounter.value} errors=${errorCounter.value} skippedAlreadyRunToday=${alreadyCheckedOnDateCount}`,
    );

    return null;
  });
