import * as functions from 'firebase-functions';
import { UserRecord } from 'firebase-functions/lib/providers/auth';
import admin from 'firebase-admin';

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
import { addTagToUser, createContact, addContactToList } from '../repositories/activeCampaign';
import constants from '../constants/common';
import { USER_CONFIGS } from '../constants/collections';

const createContactFromUser = async (user: UserRecord): Promise<string> => {
  const { email, phoneNumber, displayName } = user;

  const acPayload = {
    contact: {
      email,
      firstName: displayName,
      phone: phoneNumber,
      fieldValues: [{ field: CALENDARS_FIELD.id, value: '0' }],
    },
  } as AcContactPayload;

  const contactData = await createContact(acPayload);
  const activeCampaignId = contactData.contact.id;

  if (!activeCampaignId) {
    throw new Error(`Active Campaign user not created for email ${user.email}`);
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
      list: constants.env === 'production' ? MAIN_LIST.id : DEVELOPMENT_LIST.id,
      status: 1,
    },
  };

  return addContactToList(contactListPayload);
};

// @see https://firebase.google.com/docs/functions/auth-events
export default functions
  .region(constants.googleRegion)
  .auth.user()
  .onCreate(async (user) => {
    try {
      const { uid, providerData } = user;

      const activeCampaignId = await createContactFromUser(user);

      const { providerId } = providerData[0];
      await addTagToNewUser(activeCampaignId, providerId);
      await addNewUsertoList(activeCampaignId);

      const userPayload = {
        userId: uid,
        activeCampaignId,
      };

      await admin.firestore().collection(USER_CONFIGS).doc(uid).set(userPayload);
    } catch (err) {
      console.log(err);
    }
  });
