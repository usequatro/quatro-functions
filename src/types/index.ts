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
  [DaysOfWeek.Monday]: boolean;
  [DaysOfWeek.Tuesday]: boolean;
  [DaysOfWeek.Wednesday]: boolean;
  [DaysOfWeek.Thursday]: boolean;
  [DaysOfWeek.Friday]: boolean;
  [DaysOfWeek.Saturday]: boolean;
  [DaysOfWeek.Sunday]: boolean;
};

export enum DurationUnits {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export type RecurringConfig = {
  mostRecentTaskId: string;
  userId: string;
  unit: DurationUnits;
  amount: number;
  lastRunDate?: number | null;
  activeWeekdays?: ActiveWeekdays;
};

export enum TaskSources {
  User = 'user',
  Repeat = 'repeat',
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
  source?: TaskSources;
};

export type User = {
  uid: string;
};

export type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
};

// Common constants types
export enum Environments {
  DEV_ENVIROMENT = 'quatro-dev-88030',
  PROD_ENVIRONMENT = 'tasket-project',
}

export type EnvironmentConstants = {
  env: string;
  acBaseUrl: string;
  acApiKey: string;
  googleRegion: string;
};

// Active Campaign types
export type AcList = {
  id: string;
  name: string; // Development Contacts
  stringid: string; // Eg. development-contacts
};

export type AcListResponse = {
  lists: AcList[];
};

export type AcCustomField = {
  id: string;
  perstag: string; // Key in Active Campaign UI e.g. %CALENDAR%
  title: string;
  type: string; // text, textarea, date...
};

export type AcCustomFieldResponse = {
  fields: AcCustomField[];
};

export type AcTags = {
  id: string;
  tagType: string;
  tag: string; // The tag name itself
};

export type AcTagsResponse = {
  tags: AcTags[];
};

export type AcContactFieldValues = {
  field: string | number;
  value: string;
};

export type AcFieldValuesPayload = {
  contact: string | number;
} & AcContactFieldValues;

export type AcContact = {
  email: string;
  firstName?: string;
  phone?: string;
};

export type AcContactPayload = {
  contact: {
    fieldValues?: AcContactFieldValues[];
  } & AcContact;
};

export type AcContactResponse = {
  contact: {
    id: string;
    email: string;
    firstName?: string;
    phone?: string;
    fieldValues?: string[]; // Array of stored field values ids
  };
  fieldValues?: AcFieldValuesPayload[];
};

export type AcContactListPayload = {
  contactList: {
    list: string | number;
    contact: string | number;
    status: number; // 0 unsuscribed, 1 suscribed
  };
};

export type AcContactListResponse = {
  contacts: AcContact[];
} & AcContactListPayload;

export type AcFieldValuePayload = {
  fieldValue: AcFieldValuesPayload;
};

export type AcFieldValueResponse = {
  contacts: AcContact[];
} & AcFieldValuePayload;

export type AcTag = {
  contact: string | number;
  tag: string;
};

export type AcContactTagPayload = {
  contactTag: AcTag;
};

export type AcContactTagResponse = {
  contacts: AcContact[];
} & AcContactTagPayload;
