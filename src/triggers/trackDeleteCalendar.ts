import * as functions from 'firebase-functions';

import { Calendar } from '../schemas/calendar';
import { setCustomFieldValue } from '../utils/activeCampaignApi';
import { CALENDARS_FIELD } from '../constants/activeCampaign';
import {
  findUserCalendarsCount,
  COLLECTION as CALENDARS_COLLECTION,
} from '../repositories/calendars';
import { getUserInternalConfig } from '../repositories/userInternalConfigs';
import REGION from '../constants/region';

export default functions
  .region(REGION)
  .firestore.document(`${CALENDARS_COLLECTION}/{calendarId}`)
  .onDelete(async (change) => {
    const { userId } = change.data() as Calendar;

    const calendarsCount = await findUserCalendarsCount(userId);
    const newCount = calendarsCount > 0 ? calendarsCount - 1 : 0;

    const userInternalConfig = await getUserInternalConfig(userId);
    if (!userInternalConfig) {
      throw new Error(`User internal config for user ${userId} not found`);
    }
    const { activeCampaignId } = userInternalConfig;

    if (!activeCampaignId) {
      throw new Error(`User ${userId} doesn't have an ActiveCampaign ID`);
    }

    await setCustomFieldValue({
      fieldValue: {
        contact: activeCampaignId,
        field: CALENDARS_FIELD.id,
        value: `${newCount}`,
      },
    });
    functions.logger.info('Updated ActiveCampaign contact with calendar count', {
      activeCampaignId,
      userId,
      newCount,
    });
  });
