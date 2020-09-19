/**
 * Functionality to create task instances for recurring configurations.
 */

import * as functions from 'firebase-functions';
import differenceInWeeks from 'date-fns/differenceInWeeks';
import differenceInDays from 'date-fns/differenceInDays';
import addDays from 'date-fns/addDays';
import isSameDay from 'date-fns/isSameDay';
import { findAll, update as updateRecurringConfig } from '../repositories/recurringConfigs';
import { findById, create } from '../repositories/tasks';
import { RecurringConfig, WeekdayToggles, TaskSources, DurationUnits } from '../types';

const log = (message:string) => console.log(`[createRecurringTasks] ${message}`);

const appliesToday = (recurringConfig:RecurringConfig, now:number) : boolean => {
  const {
    unit,
    amount,
    referenceDate,
    activeWeekdays,
  } = recurringConfig;

  if (!unit || !amount || !referenceDate) {
    log(`⚠️ Missing arguments for recurrence`);
    return false;
  }

  switch (unit) {
    case DurationUnits.Day: {
      const dayDifference = differenceInDays(now, referenceDate);
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

      const weekDifference = differenceInWeeks(now, referenceDate);
      const fulfillsSeparationAmount = weekDifference % amount === 0;

      return fulfillsSeparationAmount && weekdayEnabled;
    }
    case DurationUnits.Month: {
      log(`⚠️ Month not implemented`);
      return false; // to do
    }
    case DurationUnits.Year: {
      log(`⚠️ Year not implemented`);
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
  .schedule('every 1 minute')
  .onRun(async (context) => {
    const recurringConfigsResult = await findAll();
    const now = Date.now();
    const createdTaskIds = [];

    log(`ℹ️ Found ${recurringConfigsResult.length} recurring configs`);

    for (const [rcId, recurringConfig] of recurringConfigsResult) {
      try {
        if (alreadyRunToday(recurringConfig, now)) {
          log(`ℹ️ Skipped ${rcId} because it was already executed today. recurringConfig=${JSON.stringify(recurringConfig)}`);
          continue;
        }
        if (!appliesToday(recurringConfig, now)) {
          log(`ℹ️ Skipped ${rcId} because it isn't applicable today. recurringConfig=${JSON.stringify(recurringConfig)}`);
          continue;
        }

        const { taskId } = recurringConfig;
        if (!taskId) {
          log(`ℹ️ Processed ${rcId} applicable today. No task found`);
          continue;
        }

        const task = await findById(taskId);

        if (!taskId || !task) {
          log(`🛑 Bad data, recurring config ${rcId} has no task ID`);
          continue;
        }

        const { userId } = task;
        if (!userId) {
          log(`🛑 Bad data. No userId found for task ${taskId}`);
          continue;
        }

        const referenceDifference = differenceInDays(now, recurringConfig.referenceDate);
        const newTask = {
          ...task,
          title: task.title,
          created: Date.now(),
          scheduledStart: task.scheduledStart
            ? addDays(task.scheduledStart, referenceDifference).getTime()
            : null,
          due: task.due
            ? addDays(task.due, referenceDifference).getTime()
            : null,
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

        log(`ℹ️ Processed ${rcId} applicable today. sourceTaskId=${taskId} newTaskId=${newTaskId}`);
      } catch (error) {
        log(`🛑 Error while processing recurring config ${rcId}`);
        throw error;
      }
    };
    log(`ℹ️ Finished. Created ${createdTaskIds.length} tasks. Execution time: ${(Date.now() - now)} milliseconds`);
    return null;
  });
