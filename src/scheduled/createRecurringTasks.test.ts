import sub from 'date-fns/sub';
import startOfWeek from 'date-fns/startOfWeek';
import set from 'date-fns/set';

import { DurationUnits, DaysOfWeek } from '../types';
import { applies } from './createRecurringTasks';

describe('createRecurringTasks', () => {
  describe('#applies', () => {
    it('should apply to an every day configuration', () => {
      expect(applies(
        {
          taskId: '123456',
          userId: 'abcdef',
          unit: DurationUnits.Day,
          amount: 1,
        },
        sub(new Date(), { days: 10 }).getTime(),
        Date.now(),
      )).toBe(true);
    });

    it('should not apply when the the day difference is not the amount specified', () => {
      expect(applies(
        {
          taskId: '123456',
          userId: 'abcdef',
          unit: DurationUnits.Day,
          amount: 3,
        },
        sub(new Date(), { days: 4 }).getTime(),
        Date.now(),
      )).toBe(false);
    });

    it('should apply to this Monday if we re doing it all Mondays', () => {
      expect(applies(
        {
          taskId: '123456',
          userId: 'abcdef',
          unit: DurationUnits.Week,
          amount: 1,
          activeWeekdays: {
            [DaysOfWeek.Monday]: true,
            [DaysOfWeek.Tuesday]: false,
            [DaysOfWeek.Wednesday]: false,
            [DaysOfWeek.Thursday]: false,
            [DaysOfWeek.Friday]: false,
            [DaysOfWeek.Saturday]: false,
            [DaysOfWeek.Sunday]: false,
          },
        },
        set(sub(new Date(), { days: 100 }), { hours: 10, minutes: 0 }).getTime(),
        set(startOfWeek(new Date(), { weekStartsOn: 1 }), { hours: 11, minutes: 0 }).getTime(),
      )).toBe(true);
    });

    it('should not apply to this Monday if we re doing it all Weekends', () => {
      expect(applies(
        {
          taskId: '123456',
          userId: 'abcdef',
          unit: DurationUnits.Week,
          amount: 1,
          activeWeekdays: {
            [DaysOfWeek.Monday]: false,
            [DaysOfWeek.Tuesday]: false,
            [DaysOfWeek.Wednesday]: false,
            [DaysOfWeek.Thursday]: false,
            [DaysOfWeek.Friday]: false,
            [DaysOfWeek.Saturday]: true,
            [DaysOfWeek.Sunday]: true,
          },
        },
        set(sub(new Date(), { days: 100 }), { hours: 10, minutes: 0 }).getTime(),
        set(startOfWeek(new Date(), { weekStartsOn: 1 }), { hours: 11, minutes: 0 }).getTime(),
      )).toBe(false);
    });

    it('should not apply to the day before the reference date of the month', () => {
      expect(applies(
        {
          taskId: '123456',
          userId: 'abcdef',
          unit: DurationUnits.Month,
          amount: 1,
        },
        set(new Date(), { date: 15, year: 2019, month: 2, hours: 10, minutes: 0 }).getTime(),
        set(new Date(), { date: 14, hours: 11, minutes: 0 }).getTime(),
      )).toBe(false);
    });

    it('should apply to this date of the month', () => {
      expect(applies(
        {
          taskId: '123456',
          userId: 'abcdef',
          unit: DurationUnits.Month,
          amount: 1,
        },
        set(new Date(), { date: 15, year: 2019, month: 2, hours: 10, minutes: 0 }).getTime(),
        set(new Date(), { date: 15, hours: 11, minutes: 0 }).getTime(),
      )).toBe(true);
    });
  });
});
