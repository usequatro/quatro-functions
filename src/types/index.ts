export type User = {
  uid: string;
};

export enum CalendarProvider {
  Google = 'google',
}

export enum TaskSources {
  User = 'user',
  RecurringConfig = 'recurringConfig',
}

// Active Campaign types
// export type AcList = {
//   id: string;
//   name: string; // Development Contacts
//   stringid: string; // Eg. development-contacts
// };

// export type AcListResponse = {
//   lists: AcList[];
// };

// export type AcCustomField = {
//   id: string;
//   perstag: string; // Key in Active Campaign UI e.g. %CALENDAR%
//   title: string;
//   type: string; // text, textarea, date...
// };

// export type AcCustomFieldResponse = {
//   fields: AcCustomField[];
// };

// export type AcTags = {
//   id: string;
//   tagType: string;
//   tag: string; // The tag name itself
// };

// export type AcTagsResponse = {
//   tags: AcTags[];
// };

// export type AcContactTag = {
//   tag: string;
//   contact: string;
//   id: string;
// };

// export type AcContactFieldValues = {
//   field: string | number;
//   value: string;
// };

// export type AcFieldValuesPayload = {
//   contact: string | number;
// } & AcContactFieldValues;

// export type AcContact = {
//   email: string;
//   firstName?: string;
//   phone?: string;
// };

// export type AcContactPayload = {
//   contact: {
//     fieldValues?: AcContactFieldValues[];
//   } & AcContact;
// };

// export type AcContactResponse = {
//   contact: {
//     id: string;
//     email: string;
//     firstName?: string;
//     phone?: string;
//     fieldValues?: string[]; // Array of stored field values ids
//   };
//   fieldValues?: AcFieldValuesPayload[];
// };

// export type AcContactListPayload = {
//   contactList: {
//     list: string | number;
//     contact: string | number;
//     status: number; // 0 unsuscribed, 1 suscribed
//   };
// };

// export type AcContactListResponse = {
//   contacts: AcContact[];
// } & AcContactListPayload;

// export type AcFieldValuePayload = {
//   fieldValue: AcFieldValuesPayload;
// };

// export type AcFieldValueResponse = {
//   contacts: AcContact[];
// } & AcFieldValuePayload;

// export type AcTag = {
//   contact: string | number;
//   tag: string;
// };

// export type AcContactTagPayload = {
//   contactTag: AcTag;
// };

// export type AcContactTagResponse = {
//   contactTag: AcContactTag;
// };

// export type AcContactTagListResponse = {
//   contactTags: AcContactTag[];
// };
