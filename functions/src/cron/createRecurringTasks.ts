import differenceInWeeks from 'date-fns/differenceInWeeks';
import { findAll } from '../repositories/recurringConfigs';
import { findLastByRecurringConfigId, create } from '../repositories/tasks';
import * as UNITS from '../constants/recurringDurationUnits';
import { RecurringConfig, WeekdayToggles } from '../types';

const log = (message:string) => console.log(`[createRecurringTasks] ${message}`);

const appliesToday = (recurringConfig:RecurringConfig) : boolean => {
  const {
    unit,
    amount,
    referenceDate,
    activeWeekdays,
  } = recurringConfig;

  switch (unit) {
    case UNITS.DAY: {
      return true;
    }
    case UNITS.WEEK: {
      const today = new Date();
      const weekdayNumber = today.getDay();
      const numbersToShortName : WeekdayToggles = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
      const weekday = numbersToShortName[`${weekdayNumber}`];
      const weekdayEnabled = activeWeekdays ? activeWeekdays[weekday] : false;

      const weekDifference = differenceInWeeks(today, referenceDate);
      const fulfillsSeparationAmount = weekDifference % amount === 0;

      return fulfillsSeparationAmount && weekdayEnabled;
    }
    case UNITS.MONTH: {
      return false; // to do
    }
    default:
      return false;
  }
};

export default async () => {
  log('START.');

  const recurringConfigsResult = await findAll();

  log(`Found ${recurringConfigsResult.length} recurring configs`);

  recurringConfigsResult.forEach(async ([rcId, recurringConfig]) => {
    if (!appliesToday(recurringConfig)) {
      log(`INFO. Skipped ${rcId} because it isn't applicable today`);
      return;
    }

    const [taskId, task] = await findLastByRecurringConfigId(rcId);

    if (!taskId || !task) {
      log(`INFO. Processed ${rcId} applicable today. No task found`);
      return;
    }

    const { userId } = task;
    if (!userId) {
      log(`ERROR. No userId found for task ${taskId}`);
      return;
    }
    const newTask = {
      ...task,
      created: Date.now(),
      // scheduledStart: , // todo
      // due:,
    };
    const [newTaskId] = await create(userId, newTask);
    log(`INFO. Processed ${rcId} applicable today. sourceTaskId=${taskId} newTaskId=${newTaskId}`);
  });

  log('END.');
};
