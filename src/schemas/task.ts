import Joi from 'joi';

export enum TaskBlockedByTypes {
  Task = 'task',
  FreeText = 'freeText',
}

export type Task = {
  title: string;
  effort: number;
  impact: number;
  blockedBy?: Array<string>;
  completed?: number | null;
  created?: number | null;
  description?: string | null;
  due?: number | null;
  scheduledStart?: number | null;
  userId?: string;
  recurringConfigId?: string | null;

  calendarBlockCalendarId?: string | null;
  calendarBlockStart?: number | null;
  calendarBlockEnd?: number | null;

  calendarBlockProvider?: string | null;
  calendarBlockProviderCalendarId?: string | null;
  calendarBlockProviderEventId?: string | null;
};

export const taskSchema = Joi.object({
  // these can't be empty
  userId: Joi.string(),
  title: Joi.string(),
  effort: Joi.number(),
  impact: Joi.number(),
  created: Joi.number(),

  // these can be empty
  due: Joi.number().allow(null),
  scheduledStart: Joi.number().allow(null),
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

  calendarBlockStart: Joi.number().allow(null),
  calendarBlockEnd: Joi.number().allow(null),
  calendarBlockCalendarId: Joi.string().allow(null),
  calendarBlockProviderCalendarId: Joi.string().allow(null),

  // these below are managed by the backend of Firebase Functions
  calendarBlockProvider: Joi.string().allow(null),
  calendarBlockProviderEventId: Joi.string().allow(null),
});
