import * as functions from 'firebase-functions';

import { Calendar } from '../types/calendar';
// import { setCustomFieldValue } from '../utils/activeCampaignApi';
// import { CALENDARS_FIELD } from '../constants/activeCampaign';
import {
  // findUserCalendarsCount,
  COLLECTION as CALENDARS_COLLECTION,
} from '../repositories/calendars';
// import { getUserInternalConfig } from '../repositories/userInternalConfigs';
import REGION from '../constants/region';
import { getUserExternalConfig, setUserExternalConfig } from '../repositories/userExternalConfigs';
import { findIncompleteByCalendarBlockCalendarId, update } from '../repositories/tasks';

export default functions
  .region(REGION)
  .firestore.document(`${CALENDARS_COLLECTION}/{calendarId}`)
  .onDelete(async (change) => {
    const { userId } = change.data() as Calendar;

    // Clear user's default calendar ID if it was this one
    const userExternalConfig = await getUserExternalConfig(userId);
    if (userExternalConfig?.defaultCalendarId === change.id) {
      await setUserExternalConfig(userId, { defaultCalendarId: null });
      functions.logger.info('Cleared default calendar ID', {
        userId,
        deletedCalendarId: change.id,
        previousDefaultCalendarId: userExternalConfig?.defaultCalendarId,
      });
    }

    // Clear calendar blocks from tasks linked to this calendar
    const pairs = await findIncompleteByCalendarBlockCalendarId(userId, change.id);
    for (const [id] of pairs) {
      await update(id, {
        calendarBlockStart: null,
        calendarBlockEnd: null,
        calendarBlockCalendarId: null,
        calendarBlockProvider: null,
        calendarBlockProviderCalendarId: null,
        calendarBlockProviderEventId: null,
      });
    }
    functions.logger.info(
      pairs.length > 0
        ? 'Removed calendar blocks for tasks linked to deleted calendar'
        : 'No calendar blocks to remove for tasks linked to deleted calendar',
      {
        userId,
        deletedCalendarId: change.id,
        taskIds: pairs.map(([id]) => id),
      },
    );

    // Update ActiveCampaign
    // const calendarsCount = await findUserCalendarsCount(userId);
    // const newCount = calendarsCount > 0 ? calendarsCount - 1 : 0;

    // const userInternalConfig = await getUserInternalConfig(userId);
    // if (!userInternalConfig) {
    //   throw new Error(`User internal config for user ${userId} not found`);
    // }
    // const { activeCampaignContactId } = userInternalConfig;

    // if (!activeCampaignContactId) {
    //   throw new Error(`User ${userId} doesn't have an ActiveCampaign ID`);
    // }

    // await setCustomFieldValue({
    //   fieldValue: {
    //     contact: activeCampaignContactId,
    //     field: CALENDARS_FIELD.id,
    //     value: `${newCount}`,
    //   },
    // });
    // functions.logger.info('Updated ActiveCampaign contact with calendar count', {
    //   userId,
    //   activeCampaignContactId,
    //   newCount,
    // });
  });
