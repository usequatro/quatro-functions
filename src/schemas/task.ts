import { object, string, number, array, alternatives, valid } from 'joi';
import { CalendarProvider } from '../types/index';
import { TaskBlockedByTypes } from '../types/task';

export const clampNumber = (min: number, max: number) => (value: number): number =>
  Math.min(Math.max(value, min), max);

export const taskSchema = object({
  // these can't be empty
  userId: string(),
  title: string(),
  // We clamp the number because the Firestore data could contain bigger numbers
  effort: number().integer().custom(clampNumber(0, 3), 'clampNumber'),
  impact: number().integer().custom(clampNumber(0, 3), 'clampNumber'),
  created: number(),

  // these can be empty
  due: number().allow(null),
  scheduledStart: number().allow(null),
  snoozedUntil: number().allow(null),
  description: string().allow(''),

  // these can be empty and we add defaults
  completed: number().allow(null).default(null),
  prioritizedAheadOf: string().allow(null).default(null),
  blockedBy: array()
    .items(
      alternatives().try(
        // another task blocker
        object({
          config: object({
            taskId: string(),
          }),
          type: valid(TaskBlockedByTypes.Task),
        }),
        // free text blocker
        object({
          config: object({
            value: string(),
          }),
          type: valid(TaskBlockedByTypes.FreeText),
        }),
      ),
    )
    .default([]),
  recurringConfigId: string().allow(null).default(null),

  calendarBlockStart: number().allow(null).default(null),
  calendarBlockEnd: number().allow(null).default(null),
  calendarBlockCalendarId: string().allow(null).default(null),
  calendarBlockProviderCalendarId: string().allow(null).default(null),
  calendarBlockProvider: valid(...Object.values(CalendarProvider))
    .allow(null)
    .default(null),
  calendarBlockProviderEventId: string().allow(null).default(null),
});
