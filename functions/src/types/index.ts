
type ActiveWeekdays = {
  mon: boolean,
  tue: boolean,
  wed: boolean,
  thu: boolean,
  fri: boolean,
  sat: boolean,
  sun: boolean,
};

export type RecurringConfig = {
  userId: string,
  unit: 'day' | 'week' | 'month' | 'year',
  amount: number,
  referenceDate: number,
  activeWeekdays?: ActiveWeekdays,
};

export type WeekdayToggles = { [key: string] : 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' };

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
};

export type User = {
  uid: string,
};

export type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
}
