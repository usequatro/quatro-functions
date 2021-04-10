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

// const patchCalendarEventToExcludeDate = async (
//   userId: string,
//   providerCalendarId: string,
//   providerEventId: string,
//   date: number,
// ) => {
//   // Check if task has a time block, and create event for it if so
//   const auth = await createGoogleApisAuth(userId);
//   const calendar = google.calendar({ version: 'v3', auth });

//   return calendar.events
//     .get({
//       eventId: providerEventId,
//       calendarId: providerCalendarId,
//     })
//     .then((response) => {
//       const currentRecurrence = response.data.recurrence;
//       if (!currentRecurrence) {
//         // we'd delete the event right away then
//         return deleteCalendarEvent(
//           userId,
//           providerCalendarId,
//           providerEventId,
//           DeletionReason.TaskCompletedAndEventNotRecurring,
//         );
//       }
//       const recurrenceWithoutDate = addExcludedDateToRRule(currentRecurrence, date);

//       return calendar.events
//         .patch({
//           eventId: providerEventId,
//           calendarId: providerCalendarId,
//           requestBody: {
//             recurrence: recurrenceWithoutDate,
//           },
//         })
//         .then(() => {
//           functions.logger.info(
//             `Patched event ${providerEventId} of calendar ${providerCalendarId}`,
//             {
//               userId,
//             },
//           );
//         })
//         .catch((error) => {
//           functions.logger.error('Error response from events.patch', {
//             userId,
//             providerCalendarId,
//             providerEventId,
//             errorMessage: error.message,
//             errors: error.errors,
//           });
//           throw error;
//         });
//     });
// };
