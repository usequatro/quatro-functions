import * as functions from 'firebase-functions';

import { AcFieldValuePayload, CalendarDocument } from '../types';
import { addCustomFieldValue } from '../repositories/activeCampaign';
import { CALENDARS } from '../constants/collections';
import { CALENDARS_FIELD } from '../constants/activeCampaign';
import { getUserCalendarsCount } from '../repositories/calendars';
import { getUserConfig } from '../repositories/userConfigs';
import constants from '../constants/common';

export default functions
  .region(constants.googleRegion)
  .firestore.document(`${CALENDARS}/{calendarId}`)
  .onDelete(async (change) => {
    const { userId } = change.data() as CalendarDocument;

    const calendarsCount = await getUserCalendarsCount(userId);
    const newCount = calendarsCount > 0 ? calendarsCount - 1 : 0;

    const { activeCampaignId } = await getUserConfig(userId);

    const customFieldPayload: AcFieldValuePayload = {
      fieldValue: {
        contact: activeCampaignId,
        field: CALENDARS_FIELD.id,
        value: `${newCount}`,
      },
    };

    await addCustomFieldValue(customFieldPayload);
  });
