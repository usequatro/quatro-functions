/**
 * Functionality to create task instances for recurring configurations.
 */

import * as functions from 'firebase-functions';
import differenceInWeeks from 'date-fns/differenceInWeeks';
import differenceInDays from 'date-fns/differenceInDays';
import differenceInCalendarMonths from 'date-fns/differenceInCalendarMonths';
import addMonths from 'date-fns/addMonths';
import addDays from 'date-fns/addDays';
import isToday from 'date-fns/isToday';
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
import { findAll, update as updateRecurringConfig } from '../repositories/recurringConfigs';
import { findById, create } from '../repositories/tasks';
import { RecurringConfig, DurationUnits, DaysOfWeek } from '../types';

export const applies = (
  recurringConfig: RecurringConfig,
  taskScheduledStart: number,
  now: number,
): boolean => {
  const { unit, amount, activeWeekdays } = recurringConfig;

  if (!unit) {
    throw new Error('Missing unit value');
  }
  if (!amount) {
    throw new Error('Missing amount value');
  }

  switch (unit) {
    case DurationUnits.Day: {
      const dayDifference = differenceInDays(now, taskScheduledStart);
      return dayDifference % amount === 0;
    }
    case DurationUnits.Week: {
      if (!activeWeekdays) {
        throw new Error('Missing activeWeekdays value for weekly recurrence');
      }
      const weekDifference = differenceInWeeks(now, taskScheduledStart);
      const fulfillsSeparationAmount = weekDifference % amount === 0;

      if (!fulfillsSeparationAmount) {
        return false;
      }

      return (
        (isMonday(now) && activeWeekdays[DaysOfWeek.Monday]) ||
        (isTuesday(now) && activeWeekdays[DaysOfWeek.Tuesday]) ||
        (isWednesday(now) && activeWeekdays[DaysOfWeek.Wednesday]) ||
        (isThursday(now) && activeWeekdays[DaysOfWeek.Thursday]) ||
        (isFriday(now) && activeWeekdays[DaysOfWeek.Friday]) ||
        (isSaturday(now) && activeWeekdays[DaysOfWeek.Saturday]) ||
        (isSunday(now) && activeWeekdays[DaysOfWeek.Sunday])
      );
    }
    case DurationUnits.Month: {
      const calendarMonthDifference = differenceInCalendarMonths(now, taskScheduledStart);
      const fulfillsSeparationAmount = calendarMonthDifference % amount === 0;

      if (!fulfillsSeparationAmount) {
        return false;
      }

      // addMonths() is great because it'll cap at the latest day of month if overflowing the days
      const applicableDateInThisMonth = addMonths(taskScheduledStart, calendarMonthDifference);
      if (getDate(now) !== getDate(applicableDateInThisMonth)) {
        return false;
      }

      // If today is the day, make sure we trigger this after the time
      return isAfter(now, applicableDateInThisMonth);
    }
    default:
      throw new Error(`Unknown unit value "${unit}"`);
  }
};

const alreadyRunToday = (recurringConfig: RecurringConfig, now: number) =>
  recurringConfig.lastRunDate && isSameDay(now, recurringConfig.lastRunDate);

export const getNewScheduledStart = (oldScheduledStart: number, now: number): number => {
  const scheduledStartSetToToday = setDayOfYear(oldScheduledStart, getDayOfYear(now));
  const newScheduledStartDate = setYear(scheduledStartSetToToday, getYear(now));
  return newScheduledStartDate.getTime();
};

/**
 * Scheduled task for creating recurring tasks
 * Note that this functionality uses Google Cloud Pub/Sub topic and Google Cloud Scheduler, separate
 * APIs that also need to be enabled.
 * @link https://firebase.google.com/docs/functions/schedule-functions
 * @link https://crontab.guru/
 */
export default functions.pubsub
  .schedule('*/5 * * * *') // https://crontab.guru/every-5-minutes
  .onRun(async () => {
    // @todo: make this run every minute, and the findAll exclude recurring tasks already processed recently
    // For that, we'll need to populate lastRunDate with a null value in all of them
    const recurringConfigsResult = await findAll();
    const now = Date.now();

    const configsExcludedAlreadyRun = recurringConfigsResult.filter(
      ([, recurringConfig]) => !alreadyRunToday(recurringConfig, now),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logRecords: { [key: string]: any } = {};

    for (const [rcId, recurringConfig] of configsExcludedAlreadyRun) {
      logRecords[rcId] = {
        rcId,
        userId: recurringConfig.userId,
        error: null,
        mostRecentTaskId: null,
      };
      try {
        if (!recurringConfig.mostRecentTaskId) {
          logRecords[rcId].error = {
            message: 'No taskId found for recurring config',
          };
          continue;
        }

        logRecords[rcId].mostRecentTaskId = recurringConfig.mostRecentTaskId;

        const task = await findById(recurringConfig.mostRecentTaskId);
        if (!task) {
          // @todo: consider deleting the recurring config here, since it's invalid
          logRecords[rcId].error = {
            message: 'No task found for recurringConfig.mostRecentTaskId',
          };
          continue;
        }

        if (!task.scheduledStart) {
          logRecords[rcId].error = {
            message: 'No scheduled start for most recent task',
          };
          continue;
        }

        if (!applies(recurringConfig, task.scheduledStart, now)) {
          logRecords[rcId].skipped = true;
          logRecords[rcId].skippedReason = 'Not applicable';
          continue;
        }

        if (!task.completed) {
          logRecords[rcId].skipped = true;
          logRecords[rcId].skippedReason =
            "Most recent task isn't completed. Marking as already run today";

          // We skip and also flag as already run today, so this won't apply today anymore even if the most recent task
          // is completed later
          await updateRecurringConfig(rcId, {
            lastRunDate: now,
          });
          continue;
        }

        const { userId: taskUserId } = task;
        if (!taskUserId) {
          logRecords[rcId].error = {
            message: 'No userId for most recent task',
          };
          continue;
        }
        if (taskUserId !== recurringConfig.userId) {
          logRecords[rcId].error = {
            message: "The userId values of the task and the recurringConfig don't match",
            recurringConfigUserId: recurringConfig.userId,
            mostRecentTaskUserId: taskUserId,
          };
          continue;
        }

        if (task.created && isToday(task.created)) {
          logRecords[rcId].skipped = true;
          logRecords[rcId].skippedReason = 'The most recent task was created just today';

          // We skip and also flag as already run today, so this won't apply today anymore
          await updateRecurringConfig(rcId, {
            lastRunDate: now,
          });
          continue;
        }

        const newScheduledStart = getNewScheduledStart(task.scheduledStart, now);

        const newDue = task.due
          ? addDays(task.due, differenceInDays(newScheduledStart, task.scheduledStart)).getTime()
          : null;

        const newTask = {
          ...task,
          title: task.title,
          created: Date.now(),
          scheduledStart: newScheduledStart,
          due: newDue,
          completed: null,
          recurringConfigId: rcId,
        };
        const newTaskId = await create(taskUserId, newTask);

        await updateRecurringConfig(rcId, {
          // update lastRunDate so that we don't create duplicates for the same day
          lastRunDate: now,
          // update taskId so that future tasks are cloned from latest one
          mostRecentTaskId: newTaskId,
        });

        logRecords[rcId].taskCreated = true;
        logRecords[rcId].newTaskId = newTaskId;
      } catch (error) {
        logRecords[rcId].error = {
          message: `Runtime error: ${error.message}`,
          error,
        };
      }
    }

    const errors = Object.values(logRecords).filter((logRecord) => logRecord.error);

    functions.logger.info('Recurring tasks processed', {
      length: Object.keys(logRecords).length,
      errorsLength: errors.length,
      data: logRecords,
    });

    if (errors.length > 0) {
      functions.logger.error('Errors processing recurring tasks', {
        length: errors.length,
        data: errors,
      });
    }

    return null;
  });
