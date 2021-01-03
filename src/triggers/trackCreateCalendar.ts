import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

import {
  AcContactTagPayload,
  AcContactTagResponse,
  AcFieldValuePayload,
  CalendarDocument,
} from '../types';
import { addCustomFieldValue, addTagToUser } from '../repositories/activeCampaign';
import { CALENDARS } from '../constants/collections';
import { CALENDARS_FIELD, SIGNED_GOOGLE_TAG } from '../constants/activeCampaign';
import REGION from '../constants/region';
import { getUserCalendarsCount } from '../repositories/calendars';
import { getUserInternalConfig, setUserInternalConfig } from '../repositories/userInternalConfigs';

const addGoogleTagToUser = (activeCampaignId: string): Promise<AcContactTagResponse> => {
  const contactTagPayload: AcContactTagPayload = {
    contactTag: {
      contact: activeCampaignId,
      tag: SIGNED_GOOGLE_TAG.id,
    },
  };

  return addTagToUser(contactTagPayload);
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
  .firestore.document(`${CALENDARS}/{calendarId}`)
  .onCreate(async (change) => {
    const { userId, provider } = change.data() as CalendarDocument;

    const calendarsCount = await getUserCalendarsCount(userId);
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
        await addGoogleTagToUser(activeCampaignId);
        await setUserInternalConfig(userId, {
          providersSentToActiveCampaign: [
            ...providersSentToActiveCampaign,
            FIREBASE_AUTH_GOOGLE_PROVIDER_ID,
          ],
        });
      }
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
