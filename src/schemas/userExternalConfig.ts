import { object, bool, string, number } from 'joi';

export const userExternalConfigSchema = object({
  gapiCalendarOfflineAccess: bool().default(false),
  defaultCalendarId: string().allow(null),
  timeZone: string().allow(null),
  emailDailyDigestEnabled: bool(),
  lastActivityDate: number(),
});
