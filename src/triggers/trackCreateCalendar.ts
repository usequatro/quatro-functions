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
  .region(constants.googleRegion)
  .firestore.document(`${CALENDARS}/{calendarId}`)
  .onCreate(async (change) => {
    const { userId, provider } = change.data() as CalendarDocument;

    const calendarsCount = await getUserCalendarsCount(userId);
    const userConfig = await getUserConfig(userId);
    if (!userConfig) {
      throw new Error(`User config for user ${userId} not found`);
    }
    const { activeCampaignId, providersSentToActiveCampaign } = userConfig;

    // This will only happen in case the user started using password but added a google account later on.
    // Tag the user as having signed up with Google
    if (
      provider === 'google' &&
      !providersSentToActiveCampaign.includes(FIREBASE_AUTH_GOOGLE_PROVIDER_ID)
    ) {
      const signedUpWithGoogle = await getUserHasSignedUpWithGoogleToFirebaseAuth(userId);
      if (signedUpWithGoogle) {
        await addGoogleTagToUser(activeCampaignId);
        await updateUserConfig(userId, {
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
