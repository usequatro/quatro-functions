import Joi from 'joi';
import { CalendarProviders } from '../constants/calendarProviders';

export enum TaskBlockedByTypes {
  Task = 'task',
  FreeText = 'freeText',
}

export type Task = {
  userId: string;
  title: string;
  effort: number;
  impact: number;
  description: string;
  due: number | null;
  created: number | null;
  completed: number | null;
  scheduledStart: number | null;
  snoozedUntil: number | null;
  blockedBy: Array<string>;
  recurringConfigId: string | null;
  calendarBlockCalendarId: string | null;
  calendarBlockStart: number | null;
  calendarBlockEnd: number | null;
  calendarBlockProvider: CalendarProviders | null;
  calendarBlockProviderCalendarId: string | null;
  calendarBlockProviderEventId: string | null;
};

const clampNumber = (min: number, max: number) => (value: number) => {
  return Math.min(Math.max(value, min), max);
};

export const taskSchema = Joi.object({
  // these can't be empty
  userId: Joi.string(),
  title: Joi.string(),
  // We clamp the number because the Firestore data could contain bigger numbers
  effort: Joi.number().integer().custom(clampNumber(0, 3), 'clampNumber'),
  impact: Joi.number().integer().custom(clampNumber(0, 3), 'clampNumber'),
  created: Joi.number(),

  // these can be empty
  due: Joi.number().allow(null),
  scheduledStart: Joi.number().allow(null),
  snoozedUntil: Joi.number().allow(null),
  description: Joi.string().allow(''),

  // these can be empty and we add defaults
  completed: Joi.number().allow(null).default(null),
  prioritizedAheadOf: Joi.string().allow(null).default(null),
  blockedBy: Joi.array()
    .items(
      Joi.alternatives().try(
        // another task blocker
        Joi.object({
          config: Joi.object({
            taskId: Joi.string(),
          }),
          type: Joi.valid(TaskBlockedByTypes.Task),
        }),
        // free text blocker
        Joi.object({
          config: Joi.object({
            value: Joi.string(),
          }),
          type: Joi.valid(TaskBlockedByTypes.FreeText),
        }),
      ),
    )
    .default([]),
  recurringConfigId: Joi.string().allow(null).default(null),

  calendarBlockStart: Joi.number().allow(null).default(null),
  calendarBlockEnd: Joi.number().allow(null).default(null),
  calendarBlockCalendarId: Joi.string().allow(null).default(null),
  calendarBlockProviderCalendarId: Joi.string().allow(null).default(null),
  calendarBlockProvider: Joi.valid(...Object.values(CalendarProviders))
    .allow(null)
    .default(null),
  calendarBlockProviderEventId: Joi.string().allow(null).default(null),
});
