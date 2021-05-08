import sub from 'date-fns/sub';
import startOfWeek from 'date-fns/startOfWeek';
import set from 'date-fns/set';
import format from 'date-fns/format';
import parse from 'date-fns/parse';

import { DurationUnits, DaysOfWeek } from '../../types';
import { applies, getNewScheduledStart } from './createRecurringTasks';

describe('createRecurringTasks', () => {
  describe('#applies', () => {
    it('should apply to an every day configuration', () => {
      expect(
        applies(
          {
            mostRecentTaskId: '123456',
            userId: 'abcdef',
            unit: DurationUnits.Day,
            amount: 1,
          },
          sub(new Date(), { days: 10 }).getTime(),
          Date.now(),
        ),
      ).toBe(true);
    });

    it('should not apply when the the day difference is not the amount specified', () => {
      expect(
        applies(
          {
            mostRecentTaskId: '123456',
            userId: 'abcdef',
            unit: DurationUnits.Day,
            amount: 3,
          },
          sub(new Date(), { days: 4 }).getTime(),
          Date.now(),
        ),
      ).toBe(false);
    });

    it('should apply to this Monday if we re doing it all Mondays', () => {
      expect(
        applies(
          {
            mostRecentTaskId: '123456',
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
        ),
      ).toBe(true);
    });

    it('should not apply to this Monday if we re doing it all Weekends', () => {
      expect(
        applies(
          {
            mostRecentTaskId: '123456',
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
        ),
      ).toBe(false);
    });

    it('should not apply to the day before the reference date of the month', () => {
      expect(
        applies(
          {
            mostRecentTaskId: '123456',
            userId: 'abcdef',
            unit: DurationUnits.Month,
            amount: 1,
          },
          set(new Date(), { date: 15, year: 2019, month: 2, hours: 10, minutes: 0 }).getTime(),
          set(new Date(), { date: 14, hours: 11, minutes: 0 }).getTime(),
        ),
      ).toBe(false);
    });

    it('should apply to this date of the month', () => {
      expect(
        applies(
          {
            mostRecentTaskId: '123456',
            userId: 'abcdef',
            unit: DurationUnits.Month,
            amount: 1,
          },
          set(new Date(), { date: 15, year: 2019, month: 2, hours: 10, minutes: 0 }).getTime(),
          set(new Date(), { date: 15, hours: 11, minutes: 0 }).getTime(),
        ),
      ).toBe(true);
    });
  });

  describe('#getNewScheduledStart', () => {
    it('should set the scheduled start to today', () => {
      const now = parse('2021-03-15 09:05:02', 'yyyy-MM-dd HH:mm:ss', new Date()).getTime();
      const march12 = parse('2021-03-12 08:00:00', 'yyyy-MM-dd HH:mm:ss', new Date()).getTime();

      const newScheduledStart = getNewScheduledStart(march12, now);

      expect(format(newScheduledStart, 'yyyy-MM-dd HH:mm:ss')).toBe('2021-03-15 08:00:00');
    });

    it('should set the scheduled start to today even across years', () => {
      const now = parse('2021-01-03 00:05:00', 'yyyy-MM-dd HH:mm:ss', new Date()).getTime();
      const december28 = parse('2020-12-28 12:00:00', 'yyyy-MM-dd HH:mm:ss', new Date()).getTime();

      const newScheduledStart = getNewScheduledStart(december28, now);

      expect(format(newScheduledStart, 'yyyy-MM-dd HH:mm:ss')).toBe('2021-01-03 12:00:00');
    });
  });
});
