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
import { findAll, update as updateRecurringConfig } from '../repositories/recurringConfigs';
import { findById, create } from '../repositories/tasks';
import { RecurringConfig, TaskSources, DurationUnits, DaysOfWeek } from '../types';
import { isAfter } from 'date-fns';

const log = (message: string) => console.log(`[createRecurringTasks] ${message}`);

export const applies = (recurringConfig:RecurringConfig, taskScheduledStart: number, now:number) : boolean => {
  const {
    unit,
    amount,
    activeWeekdays,
  } = recurringConfig;

  if (!unit || !amount) {
    log(`⚠️ Missing arguments for recurrence`);
    return false;
  }

  switch (unit) {
    case DurationUnits.Day: {
      const dayDifference = differenceInDays(now, taskScheduledStart);
      return dayDifference % amount === 0;
    }
    case DurationUnits.Week: {
      if (!activeWeekdays) {
        log(`⚠️ Missing arguments for week recurrence`);
        return false;
      }
      const weekDifference = differenceInWeeks(now, taskScheduledStart);
      const fulfillsSeparationAmount = weekDifference % amount === 0;

      if (!fulfillsSeparationAmount) {
        return false;
      }

      return (
        (isMonday(now) && activeWeekdays[DaysOfWeek.Monday])
        || (isTuesday(now) && activeWeekdays[DaysOfWeek.Tuesday])
        || (isWednesday(now) && activeWeekdays[DaysOfWeek.Wednesday])
        || (isThursday(now) && activeWeekdays[DaysOfWeek.Thursday])
        || (isFriday(now) && activeWeekdays[DaysOfWeek.Friday])
        || (isSaturday(now) && activeWeekdays[DaysOfWeek.Saturday])
        || (isSunday(now) && activeWeekdays[DaysOfWeek.Sunday])
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
      log(`⚠️ Unknown unit ${unit}`);
      return false;
  }
};

const alreadyRunToday = (recurringConfig:RecurringConfig, now:number) => (
  recurringConfig.lastRunDate && isSameDay(now, recurringConfig.lastRunDate)
);

/**
 * Scheduled task for creating recurring tasks every morning.
 * Note that this functionality uses Google Cloud Pub/Sub topic and Google Cloud Scheduler, separate
 * APIs that also need to be enabled.
 * @see https://firebase.google.com/docs/functions/schedule-functions
 * @see https://crontab.guru/
 */
export default functions.pubsub
  .schedule('*/15 * * * *') // https://crontab.guru/every-15-minutes
  .onRun(async () => {
    const recurringConfigsResult = await findAll();
    const now = Date.now();
    const createdTaskIds = [];

    const configsExcludedAlreadyRun = recurringConfigsResult.filter(([, recurringConfig]) =>
      !alreadyRunToday(recurringConfig, now)
    );

    for (const [rcId, recurringConfig] of configsExcludedAlreadyRun) {
      try {
        const { mostRecentTaskId, userId = '' } = recurringConfig;
        if (!mostRecentTaskId) {
          log(`🛑 Skipped ${rcId} that was applicable today because no taskId found. userId=${userId}`);
          continue;
        }

        const task = await findById(mostRecentTaskId)
          .catch((error) => { // resolve the promise, so we return `undefined` instead of throwing
            console.error(error);
          });
        if (!task) {
          // @todo: consider deleting the recurring config here, since it's invalid
          log(`👻 Skipped  ${rcId} because most recent task ${mostRecentTaskId} wasn't found. userId=${userId}`);
          continue;
        }

        if (!task.scheduledStart) {
          log(`🛑 Bad data with ${rcId}, no scheduled start date found for task ${mostRecentTaskId}. userId=${userId}`);
          continue;
        }

        if (!applies(recurringConfig, task.scheduledStart, now)) {
          log(`🔁 Skipped ${rcId} because it isn't applicable today. recurringConfig=${JSON.stringify(recurringConfig)}. userId=${userId}`);
          continue;
        }

        if (!task.completed) {
          log(`☑️ Skipped ${rcId} because its most recent task ${mostRecentTaskId} isn't completed. userId=${userId}`);
          continue;
        }

        const { userId: taskUserId } = task;
        if (!taskUserId) {
          log(`🛑 Bad data with ${rcId}, no userId found for task ${mostRecentTaskId}. userId=${userId}`);
          continue;
        }
        if (taskUserId !== userId) {
          log(`🛑 Bad data with ${rcId}, task userId ${taskUserId} doesn't match config userId. userId=${userId}`);
          continue;
        }

        if (task.created && isToday(task.created)) {
          log(`📅 Skipped ${rcId} because the task was created just today. Let's wait until tomorrow to repeat it`);
        }

        const newScheduledStart = setDayOfYear(task.scheduledStart, getDayOfYear(now)).getTime();
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
          source: TaskSources.Repeat,
        };
        const [newTaskId] = await create(taskUserId, newTask);

        await updateRecurringConfig(rcId, {
          // update lastRunDate so that we don't create duplicates for the same day
          lastRunDate: now,
          // update taskId so that future tasks are cloned from latest one
          mostRecentTaskId: newTaskId
        });

        createdTaskIds.push(newTaskId);

        log(`✅ Processed ${rcId} applicable today. sourceTaskId=${mostRecentTaskId} newTaskId=${newTaskId}. userId=${userId}`);
      } catch (error) {
        log(`🛑 Error while processing recurring config ${rcId}`);
        console.error(error);
      }
    }

    if (createdTaskIds.length > 0) {
      log(`ℹ️ Finished. Created ${createdTaskIds.length} tasks. Execution time: ${(Date.now() - now)} milliseconds`);
    }
    return null;
  });
