import { string, valid, object, number } from 'joi';

export interface Calendar {
  userId: string;
  providerCalendarId: string;
  providerUserId: string;
  providerUserEmail: string;
  provider: 'google';
  color: string;
  name: string;
  watcherChannelId?: string | null;
  // ID of the watched resource. The resourceId property is a stable, version-independent identifier for the resource
  watcherResourceId?: string | null;
  watcherExpiration?: number | null;
  watcherLastUpdated?: number | null;
}

export const calendarSchema = object({
  userId: string(),
  providerCalendarId: string(),
  providerUserId: string(),
  providerUserEmail: string(),
  provider: valid('google'),
  color: string(),
  name: string(),
  watcherChannelId: string().allow(null),
  watcherResourceId: string().allow(null),
  watcherExpiration: number().allow(null),
  watcherLastUpdated: number().allow(null),
});
