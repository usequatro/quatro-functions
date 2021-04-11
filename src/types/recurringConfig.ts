export enum DurationUnits {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export enum DaysOfWeek {
  Monday = 'mon',
  Tuesday = 'tue',
  Wednesday = 'wed',
  Thursday = 'thu',
  Friday = 'fri',
  Saturday = 'sat',
  Sunday = 'sun',
}

export type ActiveWeekdays = {
  [DaysOfWeek.Monday]: boolean;
  [DaysOfWeek.Tuesday]: boolean;
  [DaysOfWeek.Wednesday]: boolean;
  [DaysOfWeek.Thursday]: boolean;
  [DaysOfWeek.Friday]: boolean;
  [DaysOfWeek.Saturday]: boolean;
  [DaysOfWeek.Sunday]: boolean;
};

export type RecurringConfig = {
  mostRecentTaskId: string;
  userId: string;
  unit: DurationUnits;
  amount: number;
  lastRunDate?: number | null;
  activeWeekdays?: ActiveWeekdays;
  // taskDetails?: {
  //   title: string;
  //   description: string;
  //   effort: number;
  //   impact: number;
  //   dueOffsetDays: number;
  //   dueTime: string;
  // };
};
