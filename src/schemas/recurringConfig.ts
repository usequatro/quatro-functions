import { object, string, valid, number, bool } from 'joi';

// import { clampNumber } from './task';
import { DurationUnits, DaysOfWeek } from '../types/recurringConfig';

export const recurringConfigSchema = object({
  userId: string(),

  mostRecentTaskId: string().required(),
  unit: valid(...Object.values(DurationUnits)),
  amount: number(),
  lastRunDate: number().allow(null).default(null),
  activeWeekdays: object({
    [DaysOfWeek.Monday]: bool(),
    [DaysOfWeek.Tuesday]: bool(),
    [DaysOfWeek.Wednesday]: bool(),
    [DaysOfWeek.Thursday]: bool(),
    [DaysOfWeek.Friday]: bool(),
    [DaysOfWeek.Saturday]: bool(),
    [DaysOfWeek.Sunday]: bool(),
  }).allow(null),

  // taskDetails: object({
  //   title: string(),
  //   description: string().allow('').default(''),
  //   effort: number().integer().custom(clampNumber(0, 3), 'clampNumber'),
  //   impact: number().integer().custom(clampNumber(0, 3), 'clampNumber'),
  //   dueOffsetDays: number(),
  //   dueTime: string(),
  // }),
});
