import { object, bool } from 'joi';

export interface UserExternalConfig {
  gapiCalendarOfflineAccess?: boolean;
}

export const userExternalConfigSchema = object({
  gapiCalendarOfflineAccess: bool().default(false),
});
