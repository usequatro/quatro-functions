import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import cors from 'cors';

import { SIGNED_GOOGLE_TAG } from '../constants/activeCampaign';
import REGION from '../constants/region';
import { deleteCalendar, findCalendarsByUserId } from '../repositories/calendars';
import { getUserInternalConfig, setUserInternalConfig } from '../repositories/userInternalConfigs';
import { getContactTagsForContact, deleteTagFromContact } from '../utils/activeCampaignApi';

cors({ origin: true });

const deleteCalendars = async (calendarIds: string[]) => {
  for (const id of calendarIds) {
    await deleteCalendar(id)
      .then(() => {
        functions.logger.info('Deleted user calendar', {
          id,
        });
      })
      .catch((error) => {
        functions.logger.error('Error deleting user calendar', {
          id,
          error: error,
        });
      });
  }
};

const removeActiveCampaignProviderTag = async (userId: string, providerId: string) => {
  const providerIdToActiveCampaignTagId: { [key: string]: string } = {
    'google.com': SIGNED_GOOGLE_TAG.id,
  };
  const activeCampaignTagIdToRemove = providerIdToActiveCampaignTagId[providerId];

  if (!activeCampaignTagIdToRemove) {
    functions.logger.error('ActiveCampaign tag not found for provider', {
      userId: userId,
      unlinkedProviderId: providerId,
      providerIdToActiveCampaignTagId,
    });
    return;
  }

  const userInternalConfig = await getUserInternalConfig(userId);
  if (!userInternalConfig || !userInternalConfig.activeCampaignContactId) {
    functions.logger.info('No ActiveCampaign contact to remove a contact tag from', {
      userId: userId,
      unlinkedProviderId: providerId,
    });
    return;
  }

  try {
    const response = await getContactTagsForContact(userInternalConfig.activeCampaignContactId);
    const googleContactTag = (response.contactTags || []).find(
      (contactTag) => contactTag.tag === activeCampaignTagIdToRemove,
    );

    if (googleContactTag) {
      await deleteTagFromContact(googleContactTag.id);
      functions.logger.info('ActiveCampaign contact tag removed', {
        userId: userId,
        unlinkedProviderId: providerId,
        contactTag: googleContactTag,
      });
    } else {
      functions.logger.info('No contact tag to remove from ActiveCampaign', {
        userId: userId,
        unlinkedProviderId: providerId,
        contactTags: response.contactTags,
      });
    }

    const providersWithoutGoogle = userInternalConfig?.providersSentToActiveCampaign?.filter(
      (provider) => provider !== providerId,
    );
    await setUserInternalConfig(userId, {
      providersSentToActiveCampaign: providersWithoutGoogle,
    });
  } catch (error) {
    functions.logger.error('Error in ActiveCampaign contact tag cleaning', {
      userId: userId,
      unlinkedProviderId: providerId,
      error,
    });
  }
};

/**
 * @link https://developers.google.com/identity/sign-in/web/server-side-flow
 */
export default functions.region(REGION).https.onCall(async (data, context) => {
  // Checking that the user is authenticated.
  if (!context.auth) {
    functions.logger.error('No user authenticated');
    // @link https://firebase.google.com/docs/reference/swift/firebasefunctions/api/reference/Enums/FunctionsErrorCode
    throw new functions.https.HttpsError(
      'failed-precondition',
      'The function must be called while authenticated.',
    );
  }
  if (!data.unlinkedProviderId) {
    functions.logger.error('No unlinkedProviderId received', { userId: context.auth.uid });
    throw new functions.https.HttpsError('invalid-argument', 'unlinkedProviderId is missing.');
  }

  const firebaseUser = await admin.auth().getUser(context.auth.uid);
  const unlinkedProvider = firebaseUser.providerData.find(
    (provider) => provider.providerId === data.unlinkedProviderId,
  );

  if (unlinkedProvider) {
    functions.logger.error('Unexpectedly provider is still present', {
      userId: context.auth.uid,
      unlinkedProviderId: data.unlinkedProviderId,
      unlinkedProviderFound: unlinkedProvider,
    });
    throw new functions.https.HttpsError('aborted', 'Unexpectedly provider is still present');
  }

  functions.logger.info('Handling unlinking of provider', {
    userId: context.auth.uid,
    data,
  });

  switch (data.unlinkedProviderId) {
    case 'google.com': {
      // Remove calendars and cancel their watchers
      const userCalendars = await findCalendarsByUserId(context.auth.uid);
      const googleCalendars = userCalendars.filter(
        ([, calendar]) => calendar.provider === 'google',
      );

      if (googleCalendars.length === 0) {
        functions.logger.info('No calendars for provider', {
          userId: context.auth.uid,
          calendars: userCalendars,
        });
      }

      // Since the frontend should be revoking Google Calendar access,
      // there should be no need to stop active watch channels

      await deleteCalendars(googleCalendars.map(([id]) => id));

      // Remove tag from Active Campaign
      await removeActiveCampaignProviderTag(context.auth.uid, data.unlinkedProviderId);

      break;
    }
    default: {
      functions.logger.warn('Uknown provider unlinked', {
        userId: context.auth.uid,
        unlinkedProviderId: data.unlinkedProviderId,
      });
    }
  }

  return {};
});
