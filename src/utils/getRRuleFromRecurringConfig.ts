import { DaysOfWeek, DurationUnits, RecurringConfig, ActiveWeekdays } from '../types';

import { RRule, RRuleSet, Weekday } from 'rrule';

const durationUnitsToRruleFrequency = {
  [DurationUnits.Day]: RRule.DAILY,
  [DurationUnits.Week]: RRule.WEEKLY,
  [DurationUnits.Month]: RRule.MONTHLY,
};

const daysOfWeekToWeekdays = {
  [DaysOfWeek.Monday]: RRule.MO,
  [DaysOfWeek.Tuesday]: RRule.TU,
  [DaysOfWeek.Wednesday]: RRule.WE,
  [DaysOfWeek.Thursday]: RRule.TH,
  [DaysOfWeek.Friday]: RRule.FR,
  [DaysOfWeek.Saturday]: RRule.SA,
  [DaysOfWeek.Sunday]: RRule.SU,
};

const getByWeekdayFromActiveWeekdays = (activeWeekdays: ActiveWeekdays): Weekday[] => {
  const weekdayArray = Object.entries(activeWeekdays).reduce((memo: Weekday[], entry) => {
    const [dayOfWeek, active] = entry;
    if (active) {
      return memo.concat(daysOfWeekToWeekdays[dayOfWeek as DaysOfWeek]);
    }
    return memo;
  }, []);
  return weekdayArray;
};

export default function getRRuleFromRecurringConfig(
  recurringConfig: RecurringConfig,
): Array<string> {
  const rruleSet = new RRuleSet();
  rruleSet.rrule(
    new RRule({
      freq: durationUnitsToRruleFrequency[recurringConfig.unit],
      interval: recurringConfig.amount,
      byweekday:
        recurringConfig.unit === DurationUnits.Week && recurringConfig.activeWeekdays
          ? getByWeekdayFromActiveWeekdays(recurringConfig.activeWeekdays)
          : undefined,
    }),
  );

  return rruleSet.valueOf();
}
