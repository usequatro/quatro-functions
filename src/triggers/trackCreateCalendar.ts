import * as functions from 'firebase-functions';

import {
  AcContactTagPayload,
  AcContactTagResponse,
  AcFieldValuePayload,
  CalendarDocument,
} from '../types';
import { addCustomFieldValue, addTagToUser } from '../repositories/activeCampaign';
import { CALENDARS } from '../constants/collections';
import { CALENDARS_FIELD, SIGNED_GOOGLE_TAG } from '../constants/activeCampaign';
import { getUserCalendarsCount } from '../repositories/calendars';
import { getUserConfig, updateUserConfig } from '../repositories/userConfigs';
import constants from '../constants/common';

const addGoogleTagToUser = (activeCampaignId: string): Promise<AcContactTagResponse> => {
  const contactTagPayload: AcContactTagPayload = {
    contactTag: {
      contact: activeCampaignId,
      tag: SIGNED_GOOGLE_TAG.id,
    },
  };

  return addTagToUser(contactTagPayload);
};

export default functions
  .region(constants.googleRegion)
  .firestore.document(`${CALENDARS}/{calendarId}`)
  .onCreate(async (change) => {
    const { userId, provider } = change.data() as CalendarDocument;

    const calendarsCount = await getUserCalendarsCount(userId);
    const { activeCampaignId, providers } = await getUserConfig(userId);

    // Include google in userConfig providers and add it to the CRM.
    // This will only happen in case the user started using password but added a google account later on.
    if (provider === 'google' && !providers.includes('google')) {
      await updateUserConfig(userId, {
        providers: [...providers, provider],
      });

      await addGoogleTagToUser(activeCampaignId);
    }

    const customFieldPayload: AcFieldValuePayload = {
      fieldValue: {
        contact: activeCampaignId,
        field: CALENDARS_FIELD.id,
        value: `${calendarsCount + 1}`,
      },
    };

    await addCustomFieldValue(customFieldPayload);
  });
