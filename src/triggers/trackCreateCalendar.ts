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
  .onCreate(async (change) => {
    const { userId } = change.data() as CalendarDocument;

    const calendarsCount = await getUserCalendarsCount(userId);
    const { activeCampaignId } = await getUserConfig(userId);

    const customFieldPayload: AcFieldValuePayload = {
      fieldValue: {
        contact: activeCampaignId,
        field: CALENDARS_FIELD.id,
        value: `${calendarsCount + 1}`,
      },
    };

    await addCustomFieldValue(customFieldPayload);
  });
