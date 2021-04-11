import { string, valid, object, number } from 'joi';
import { CalendarProvider } from '../types/index';

export const calendarSchema = object({
  userId: string(),
  providerCalendarId: string(),
  providerUserId: string(),
  providerUserEmail: string(),
  provider: valid(CalendarProvider.Google),
  color: string(),
  name: string(),
  watcherChannelId: string().allow(null),
  watcherResourceId: string().allow(null),
  watcherExpiration: number().allow(null),
  watcherLastUpdated: number().allow(null),
});
