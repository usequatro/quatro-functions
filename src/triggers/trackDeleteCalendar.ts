import * as functions from 'firebase-functions';

import { CalendarDocument } from '../types';
import { addCustomFieldValue } from '../utils/activeCampaignApi';
import { CALENDARS_FIELD } from '../constants/activeCampaign';
import {
  getUserCalendarsCount,
  COLLECTION as CALENDARS_COLLECTION,
} from '../repositories/calendars';
import { getUserInternalConfig } from '../repositories/userInternalConfigs';
import REGION from '../constants/region';

export default functions
  .region(REGION)
  .firestore.document(`${CALENDARS_COLLECTION}/{calendarId}`)
  .onDelete(async (change) => {
    const { userId } = change.data() as CalendarDocument;

    const calendarsCount = await getUserCalendarsCount(userId);
    const newCount = calendarsCount > 0 ? calendarsCount - 1 : 0;

    const userInternalConfig = await getUserInternalConfig(userId);
    if (!userInternalConfig) {
      throw new Error(`User internal config for user ${userId} not found`);
    }
    const { activeCampaignId } = userInternalConfig;

    if (!activeCampaignId) {
      throw new Error(`User ${userId} doesn't have an ActiveCampaign ID`);
    }

    await addCustomFieldValue({
      fieldValue: {
        contact: activeCampaignId,
        field: CALENDARS_FIELD.id,
        value: `${newCount}`,
      },
    });
  });
