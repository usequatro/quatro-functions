export interface UserExternalConfig {
  gapiCalendarOfflineAccess?: boolean;
  defaultCalendarId?: string | null;
  timeZone?: string;
  emailDailyDigestEnabled?: boolean;
  lastActivityDate?: number;
}
