import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

import { AcContactTagPayload, AcContactTagResponse, AcFieldValuePayload } from '../types';
import { setCustomFieldValue, addTagToContact } from '../utils/activeCampaignApi';
import { CALENDARS_FIELD, SIGNED_GOOGLE_TAG } from '../constants/activeCampaign';
import REGION from '../constants/region';
import {
  findUserCalendarsCount,
  COLLECTION as CALENDARS_COLLECTION,
} from '../repositories/calendars';
import { Calendar } from '../schemas/calendar';
import { getUserInternalConfig, setUserInternalConfig } from '../repositories/userInternalConfigs';

const addGoogleTagToContact = (activeCampaignId: string): Promise<AcContactTagResponse> => {
  const contactTagPayload: AcContactTagPayload = {
    contactTag: {
      contact: activeCampaignId,
      tag: SIGNED_GOOGLE_TAG.id,
    },
  };

  return addTagToContact(contactTagPayload);
};

const FIREBASE_AUTH_GOOGLE_PROVIDER_ID = 'google.com';

const getUserHasSignedUpWithGoogleToFirebaseAuth = (userId: string) =>
  admin
    .auth()
    .getUser(userId)
    .then((userRecord) => {
      return Boolean(
        (userRecord.providerData || []).find(
          (provider) => provider.providerId === FIREBASE_AUTH_GOOGLE_PROVIDER_ID,
        ),
      );
    });

export default functions
  .region(REGION)
  .firestore.document(`${CALENDARS_COLLECTION}/{calendarId}`)
  .onCreate(async (change) => {
    const { userId, provider } = change.data() as Calendar;

    const calendarsCount = await findUserCalendarsCount(userId);
    const userInternalConfig = await getUserInternalConfig(userId);
    if (!userInternalConfig) {
      throw new Error(`User internal config for user ${userId} not found`);
    }
    const { activeCampaignId, providersSentToActiveCampaign = [] } = userInternalConfig;

    if (!activeCampaignId) {
      throw new Error(`User ${userId} doesn't have an ActiveCampaign ID`);
    }

    // This will only happen in case the user started using password but added a google account later on.
    // Tag the user as having signed up with Google
    if (
      provider === 'google' &&
      !providersSentToActiveCampaign.includes(FIREBASE_AUTH_GOOGLE_PROVIDER_ID)
    ) {
      const signedUpWithGoogle = await getUserHasSignedUpWithGoogleToFirebaseAuth(userId);
      if (signedUpWithGoogle) {
        await addGoogleTagToContact(activeCampaignId);
        await setUserInternalConfig(userId, {
          providersSentToActiveCampaign: [
            ...providersSentToActiveCampaign,
            FIREBASE_AUTH_GOOGLE_PROVIDER_ID,
          ],
        });

        functions.logger.info('Added Google Tag to ActiveCampaign conctact', {
          activeCampaignId,
          userId,
        });
      }
    }

    const newCount = `${calendarsCount + 1}`;
    await setCustomFieldValue({
      fieldValue: {
        contact: activeCampaignId,
        field: CALENDARS_FIELD.id,
        value: newCount,
      },
    });
    functions.logger.info('Updated ActiveCampaign contact with calendar count', {
      activeCampaignId,
      userId,
      newCount,
    });
  });
