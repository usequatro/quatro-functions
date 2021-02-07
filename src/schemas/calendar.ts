import { string, valid, object, number } from 'joi';
import { CalendarProviders } from '../constants/calendarProviders';

export interface Calendar {
  userId: string;
  providerCalendarId: string;
  providerUserId: string;
  providerUserEmail: string;
  provider: CalendarProviders;
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
  provider: valid(CalendarProviders.Google),
  color: string(),
  name: string(),
  watcherChannelId: string().allow(null),
  watcherResourceId: string().allow(null),
  watcherExpiration: number().allow(null),
  watcherLastUpdated: number().allow(null),
});
