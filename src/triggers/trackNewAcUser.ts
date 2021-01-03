import * as functions from 'firebase-functions';
import { UserRecord } from 'firebase-functions/lib/providers/auth';

import {
  AcContactListPayload,
  AcContactListResponse,
  AcContactPayload,
  AcContactTagPayload,
  AcContactTagResponse,
} from '../types/index';
import {
  CALENDARS_FIELD,
  DEVELOPMENT_LIST,
  MAIN_LIST,
  SIGNED_GOOGLE_TAG,
  SIGNED_PASSWORD_TAG,
} from '../constants/activeCampaign';
import { addTagToUser, createContact, addContactToList } from '../utils/activeCampaignApi';
import REGION from '../constants/region';
import ENVIRONMENT from '../constants/environment';
import { setUserInternalConfig } from '../repositories/userInternalConfigs';

const addDevelopmentFlagToAvoidCollisionsBetweenEnvironments = (email: string) => {
  const devEmail = email.replace(/@/, '+development@');
  console.log(`▶️ Dev mode email ${devEmail}`);
  return devEmail;
};

const createContactFromUser = async (user: UserRecord): Promise<string> => {
  const { email = '', phoneNumber, displayName } = user;

  const acPayload = {
    contact: {
      email:
        ENVIRONMENT === 'dev'
          ? addDevelopmentFlagToAvoidCollisionsBetweenEnvironments(email)
          : email,
      firstName: displayName,
      phone: phoneNumber,
      fieldValues: [{ field: CALENDARS_FIELD.id, value: '0' }],
    },
  } as AcContactPayload;

  const response = await createContact(acPayload);
  const activeCampaignId = response.contact?.id;
  if (!activeCampaignId) {
    console.info(JSON.stringify(response));
    throw new Error(
      `Active Campaign user not created for email ${user.email}. Contact ID not returned`,
    );
  }

  return activeCampaignId;
};

const GOOGLE_PROVIDER = 'google.com';
const PASSWORD_PROVIDER = 'password';

const tagFromProvider: { [key: string]: typeof SIGNED_GOOGLE_TAG } = {
  [GOOGLE_PROVIDER]: SIGNED_GOOGLE_TAG,
  [PASSWORD_PROVIDER]: SIGNED_PASSWORD_TAG,
};

const addTagToNewUser = async (
  activeCampaignId: string,
  providerId: string,
): Promise<AcContactTagResponse> => {
  const signedTag = tagFromProvider[providerId];

  if (!signedTag) {
    throw new Error('Invalid registration provider supplied');
  }

  const contactTagPayload: AcContactTagPayload = {
    contactTag: {
      contact: activeCampaignId,
      tag: signedTag.id,
    },
  };

  return addTagToUser(contactTagPayload);
};

const addNewUsertoList = async (activeCampaignId: string): Promise<AcContactListResponse> => {
  const contactListPayload: AcContactListPayload = {
    contactList: {
      contact: activeCampaignId,
      list: ENVIRONMENT === 'prod' ? MAIN_LIST.id : DEVELOPMENT_LIST.id,
      status: 1,
    },
  };

  return addContactToList(contactListPayload);
};

// @see https://firebase.google.com/docs/functions/auth-events
export default functions
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    console.log(`▶️ ActiveCampaign user creation ${user.uid} ${user.email}`);
    const { uid, providerData } = user;

    const activeCampaignId = await createContactFromUser(user);

    const { providerId } = providerData[0];
    await addTagToNewUser(activeCampaignId, providerId);
    await addNewUsertoList(activeCampaignId);

    await setUserInternalConfig(uid, {
      activeCampaignId,
      providersSentToActiveCampaign: [providerId],
    });
  });
