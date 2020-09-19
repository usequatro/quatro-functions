type ActiveWeekdays = {
  mon: boolean,
  tue: boolean,
  wed: boolean,
  thu: boolean,
  fri: boolean,
  sat: boolean,
  sun: boolean,
};

export enum DurationUnits {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year',
};

export type RecurringConfig = {
  taskId: string,
  userId: string,
  unit: DurationUnits,
  amount: number,
  referenceDate: number,
  lastRunDate: number,
  activeWeekdays?: ActiveWeekdays,
};

export type WeekdayToggles = { [key: string] : 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' };

export enum TaskSources {
  User = 'user',
  Repeat = 'repeat',
};

export type Task = {
  title: string,
  effort: number,
  impact: number,
  blockedBy?: Array<string>,
  completed?: number | null,
  created?: number | null,
  description?: string | null,
  due?: number | null,
  scheduledStart?: number | null,
  trashed?: number | null,
  userId?: string,
  recurringConfigId?: string | null,
  source?: TaskSources,
};

export type User = {
  uid: string,
};

export type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
}
