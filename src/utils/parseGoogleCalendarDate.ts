import parseISO from 'date-fns/parseISO';
import startOfDay from 'date-fns/startOfDay';
import parse from 'date-fns/parse';
import { calendar_v3 } from 'googleapis';

/**
 * Takes the start or end date object of the Google Calendar event resource and returns a timestamp
 * @link https://developers.google.com/calendar/v3/reference/events#resource
 * @param dateObject
 * @returns {number|undefined}
 */
export default function parseGoogleCalendarDate(
  dateObject: calendar_v3.Schema$EventDateTime,
): number | undefined {
  if (dateObject.dateTime) {
    return parseISO(dateObject.dateTime).getTime();
  }
  if (dateObject.date) {
    return parse(dateObject.date, 'yyyy-MM-dd', startOfDay(new Date())).getTime();
  }
  return undefined;
}
