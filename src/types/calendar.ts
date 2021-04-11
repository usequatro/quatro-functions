import { CalendarProvider } from './';

export interface Calendar {
  userId: string;
  providerCalendarId: string;
  providerUserId: string;
  providerUserEmail: string;
  provider: CalendarProvider;
  color: string;
  name: string;
  watcherChannelId?: string | null;
  // ID of the watched resource. The resourceId property is a stable, version-independent identifier for the resource
  watcherResourceId?: string | null;
  watcherExpiration?: number | null;
  watcherLastUpdated?: number | null;
}
