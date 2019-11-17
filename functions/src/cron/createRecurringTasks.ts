/**
 * Functionality to create task instances for recurring configurations.
 */

import differenceInWeeks from 'date-fns/differenceInWeeks';
import differenceInDays from 'date-fns/differenceInDays';
import addDays from 'date-fns/addDays';
import startOfDay from 'date-fns/startOfDay';
import isSameDay from 'date-fns/isSameDay';
import { findAll, update as updateRecurringConfig } from '../repositories/recurringConfigs';
import { findLastByRecurringConfigId, create } from '../repositories/tasks';
import * as UNITS from '../constants/recurringDurationUnits';
import { RecurringConfig, WeekdayToggles } from '../types';

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
    case UNITS.DAY: {
      const dayDifference = differenceInDays(now, referenceDate);
      return dayDifference % amount === 0;
    }
    case UNITS.WEEK: {
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
    case UNITS.MONTH: {
      log(`⚠️ Month not implemented`);
      return false; // to do
    }
    case UNITS.YEAR: {
      log(`⚠️ Year not implemented`);
      return false; // to do
    }
    default:
      log(`⚠️ Unknown unit ${unit}`);
      return false;
  }
};

const alreadyRunToday = (recurringConfig:RecurringConfig, now:number) => (
  isSameDay(now, recurringConfig.referenceDate)
);

export default async (dayOffset:number = 0) => {
  const recurringConfigsResult = await findAll();
  const now = addDays(Date.now(), dayOffset).getTime();

  log(`ℹ️ Found ${recurringConfigsResult.length} recurring configs`);

  for (const [rcId, recurringConfig] of recurringConfigsResult) {
    try {
      if (!appliesToday(recurringConfig, now)) {
        log(`ℹ️ Skipped ${rcId} because it isn't applicable today. recurringConfig=${JSON.stringify(recurringConfig)}`);
        continue;
      }
      if (alreadyRunToday(recurringConfig, now)) {
        log(`ℹ️ Skipped ${rcId} because it was already executed today. recurringConfig=${JSON.stringify(recurringConfig)}`);
        continue;
      }

      const [taskId, task] = await findLastByRecurringConfigId(rcId);

      if (!taskId || !task) {
        log(`ℹ️ Processed ${rcId} applicable today. No task found`);
        continue;
      }

      const { userId } = task;
      if (!userId) {
        log(`🛑 No userId found for task ${taskId}`);
        continue;
      }
      const daysOfDifference = differenceInDays(now, recurringConfig.referenceDate);
      const newTask = {
        ...task,
        title: `${task.title.replace(/\s[🔁]+$/, '')} 🔁`,
        created: Date.now(),
        scheduledStart: task.scheduledStart ? addDays(task.scheduledStart, daysOfDifference).getTime() : null,
        due: task.due ? addDays(task.due, daysOfDifference).getTime() : null,
        completed: null,
      };
      const [newTaskId] = await create(userId, newTask);

      // setting reference date to today so that future tasks can just calculate the diff with today
      await updateRecurringConfig(rcId, { referenceDate: startOfDay(now).getTime() });

      log(`ℹ️ Processed ${rcId} applicable today. sourceTaskId=${taskId} newTaskId=${newTaskId}`);
    } catch (error) {
      log(`🛑 Error while processing recurring config ${rcId}`);
      throw error;
    }
  };
};
