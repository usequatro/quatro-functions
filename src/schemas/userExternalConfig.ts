import { object, bool, string } from 'joi';

export const userExternalConfigSchema = object({
  gapiCalendarOfflineAccess: bool().default(false),
  defaultCalendarId: string().allow(null),
  timeZone: string().allow(null),
  emailDailyDigestEnabled: bool(),
});
