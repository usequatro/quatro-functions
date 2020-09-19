/**
 * Functionality to create task instances for recurring configurations.
 */

import * as functions from 'firebase-functions';
import differenceInWeeks from 'date-fns/differenceInWeeks';
import differenceInDays from 'date-fns/differenceInDays';
import addDays from 'date-fns/addDays';
import isSameDay from 'date-fns/isSameDay';
import setDayOfYear from 'date-fns/setDayOfYear';
import getDayOfYear from 'date-fns/getDayOfYear';
import { findAll, update as updateRecurringConfig } from '../repositories/recurringConfigs';
import { findById, create } from '../repositories/tasks';
import { RecurringConfig, WeekdayToggles, TaskSources, DurationUnits } from '../types';

const log = (message:string) => console.log(`[createRecurringTasks] ${message}`);

const appliesNow = (recurringConfig:RecurringConfig, taskScheduledStart: number, now:number) : boolean => {
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
      const weekdayNumber = (new Date(now)).getDay();
      const numbersToShortName : WeekdayToggles = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
      const weekday = numbersToShortName[`${weekdayNumber}`];
      const weekdayEnabled = activeWeekdays ? activeWeekdays[weekday] : false;

      const weekDifference = differenceInWeeks(now, taskScheduledStart);
      const fulfillsSeparationAmount = weekDifference % amount === 0;

      return fulfillsSeparationAmount && weekdayEnabled;
    }
    case DurationUnits.Month: {
      log(`⚠️ Month not implemented`);
      return false; // to do
    }
    default:
      log(`⚠️ Unknown unit ${unit}`);
      return false;
  }
};

const alreadyRunToday = (recurringConfig:RecurringConfig, now:number) => (
  isSameDay(now, recurringConfig.lastRunDate)
);

/**
 * Scheduled task for creating recurring tasks every morning.
 * Note that this functionality uses Google Cloud Pub/Sub topic and Google Cloud Scheduler, separate
 * APIs that also need to be enabled.
 * @see https://firebase.google.com/docs/functions/schedule-functions
 * @see https://crontab.guru/
 */
export default functions.pubsub
  .schedule('*/5 * * * *') // https://crontab.guru/every-5-minutes
  .onRun(async () => {
    const recurringConfigsResult = await findAll();
    const now = Date.now();
    const createdTaskIds = [];

    const configsExcludedAlreadyRun = recurringConfigsResult.filter(([, recurringConfig]) =>
      !alreadyRunToday(recurringConfig, now)
    );

    for (const [rcId, recurringConfig] of configsExcludedAlreadyRun) {
      try {
        const { taskId } = recurringConfig;
        if (!taskId) {
          log(`ℹ️ Skipped ${rcId} that was applicable today because no taskId found`);
          continue;
        }

        const task = await findById(taskId);
        if (!task) {
          log(`🛑 Bad data, recurring config ${rcId} has no task ID`);
          continue;
        }

        if (!task.scheduledStart) {
          log(`🛑 Bad data. No valid reference date found for task ${taskId}`);
          continue;
        }

        if (!appliesNow(recurringConfig, task.scheduledStart, now)) {
          log(`ℹ️ Skipped ${rcId} because it isn't applicable today. recurringConfig=${JSON.stringify(recurringConfig)}`);
          continue;
        }

        const { userId } = task;
        if (!userId) {
          log(`🛑 Bad data. No userId found for task ${taskId}`);
          continue;
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
        const [newTaskId] = await create(userId, newTask);

        await updateRecurringConfig(rcId, {
          // update lastRunDate so that we don't create duplicates for the same day
          lastRunDate: now,
          // update taskId so that future tasks are cloned from latest one
          taskId: newTaskId
        });

        createdTaskIds.push(newTaskId);

        log(`✅ Processed ${rcId} applicable today. sourceTaskId=${taskId} newTaskId=${newTaskId}`);
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
