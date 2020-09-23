export enum DaysOfWeek {
  Monday = 'mon',
  Tuesday = 'tue',
  Wednesday = 'wed',
  Thursday = 'thu',
  Friday = 'fri',
  Saturday = 'sat',
  Sunday = 'sun',
}

type ActiveWeekdays = {
  [DaysOfWeek.Monday]: boolean,
  [DaysOfWeek.Tuesday]: boolean,
  [DaysOfWeek.Wednesday]: boolean,
  [DaysOfWeek.Thursday]: boolean,
  [DaysOfWeek.Friday]: boolean,
  [DaysOfWeek.Saturday]: boolean,
  [DaysOfWeek.Sunday]: boolean,
};

export enum DurationUnits {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export type RecurringConfig = {
  mostRecentTaskId: string,
  userId: string,
  unit: DurationUnits,
  amount: number,
  lastRunDate?: number | null,
  activeWeekdays?: ActiveWeekdays,
};

export enum TaskSources {
  User = 'user',
  Repeat = 'repeat',
}

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
