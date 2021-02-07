import { object, bool, string } from 'joi';

export interface UserExternalConfig {
  gapiCalendarOfflineAccess?: boolean;
  defaultCalendarId?: string | null;
}

export const userExternalConfigSchema = object({
  gapiCalendarOfflineAccess: bool().default(false),
  defaultCalendarId: string().allow(null),
});
