import { RRuleSet, rrulestr } from 'rrule';

export default function addExcludedDateToRRule(rrules: string[], date: number): Array<string> {
  const rruleSet = rrulestr(rrules.join('\n'), { forceset: true }) as RRuleSet;
  rruleSet.exdate(new Date(date));
  return rruleSet.valueOf();
}

// const fetchCalendarTimezone = async (
//   calendar: calendar_v3.Calendar,
//   providerCalendarId: string,
//   calendarId: string,
//   userId: string,
//   reason: CreationReason,
// ): Promise<string | null | undefined> =>
//   calendar.calendars
//     .get({
//       calendarId: providerCalendarId,
//     })
//     .then((response) => {
//       const calendarResource = response.data;
//       return calendarResource.timeZone;
//     })
//     .catch((error) => {
//       functions.logger.error(`Error fetching calendar ${providerCalendarId} for time zone`, {
//         reason,
//         userId,
//         calendarId,
//         errorMessage: error.message,
//         errors: error.errors,
//       });
//       return undefined;
//     });
