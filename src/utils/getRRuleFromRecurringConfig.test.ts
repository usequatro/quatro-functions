// import parseISO from 'date-fns/parseISO';
import getRRuleFromRecurringConfig from './getRRuleFromRecurringConfig';

import { DaysOfWeek, DurationUnits, RecurringConfig } from '../types';
describe('getRRuleFromRecurringConfig', () => {
  it('should format a daily recurring config to RFC 5545 value', () => {
    const rc: RecurringConfig = {
      unit: DurationUnits.Day,
      userId: '1213adsad2345667889',
      mostRecentTaskId: '1u2obaos9dhaw13',
      amount: 1,
    };
    // const timestamp = parseISO('20210301T090000Z');
    const value = getRRuleFromRecurringConfig(rc);
    expect(value).toEqual(['RRULE:FREQ=DAILY;INTERVAL=1']);
  });

  it('should format a weekly recurring config to RFC 5545 value', () => {
    const rc: RecurringConfig = {
      unit: DurationUnits.Week,
      userId: '1213adsad2345667889',
      mostRecentTaskId: '1u2obaos9dhaw13',
      amount: 1,
      activeWeekdays: {
        [DaysOfWeek.Monday]: true,
        [DaysOfWeek.Tuesday]: false,
        [DaysOfWeek.Wednesday]: true,
        [DaysOfWeek.Thursday]: false,
        [DaysOfWeek.Friday]: true,
        [DaysOfWeek.Saturday]: false,
        [DaysOfWeek.Sunday]: false,
      },
    };
    // const timestamp = parseISO('20210301T090000Z');
    const value = getRRuleFromRecurringConfig(rc);
    expect(value).toEqual([`RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR`]);
  });
});
