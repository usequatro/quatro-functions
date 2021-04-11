import { CalendarProvider } from './';

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
  calendarBlockProvider: CalendarProvider | null;
  calendarBlockProviderCalendarId: string | null;
  calendarBlockProviderEventId: string | null;
};
