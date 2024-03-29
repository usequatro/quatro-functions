// import * as functions from 'firebase-functions';
// import { UserRecord } from 'firebase-functions/lib/providers/auth';

// import {
//   AcContactListPayload,
//   AcContactListResponse,
//   AcContactPayload,
//   AcContactTagPayload,
//   AcContactTagResponse,
// } from '../types/index';
// import {
//   CALENDARS_FIELD,
//   DEVELOPMENT_LIST,
//   MAIN_LIST,
//   SIGNED_GOOGLE_TAG,
//   SIGNED_PASSWORD_TAG,
// } from '../constants/activeCampaign';
// import {
//   addTagToContact,
//   createContact,
//   addContactToList,
// } from '../utils/activeCampaignApi.unused';
// import REGION from '../constants/region';
// import ENVIRONMENT from '../constants/environment';
// import { setUserInternalConfig } from '../repositories/userInternalConfigs';

// const addDevelopmentFlagToAvoidCollisionsBetweenEnvironments = (email: string) =>
//   email.replace(/@/, '+development@');

// const createContactFromUser = async (user: UserRecord): Promise<[string, string]> => {
//   const { email = '', phoneNumber, displayName } = user;

//   const contactEmail =
//     ENVIRONMENT === 'dev' ? addDevelopmentFlagToAvoidCollisionsBetweenEnvironments(email) : email;

//   const acPayload = {
//     contact: {
//       email: contactEmail,
//       firstName: displayName,
//       phone: phoneNumber,
//       fieldValues: [{ field: CALENDARS_FIELD.id, value: '0' }],
//     },
//   } as AcContactPayload;

//   const response = await createContact(acPayload);
//   const contactId = response.contact?.id;
//   if (!contactId) {
//     console.info(JSON.stringify(response));
//     throw new Error(
//       `Active Campaign user not created for email ${user.email}. Contact ID not returned`,
//     );
//   }

//   return [contactId, contactEmail];
// };

// const GOOGLE_PROVIDER = 'google.com';
// const PASSWORD_PROVIDER = 'password';

// const tagFromProvider: { [key: string]: typeof SIGNED_GOOGLE_TAG } = {
//   [GOOGLE_PROVIDER]: SIGNED_GOOGLE_TAG,
//   [PASSWORD_PROVIDER]: SIGNED_PASSWORD_TAG,
// };

// const addTagToNewUser = async (
//   activeCampaignContactId: string,
//   providerId: string,
// ): Promise<AcContactTagResponse> => {
//   const signedTag = tagFromProvider[providerId];

//   if (!signedTag) {
//     throw new Error('Invalid registration provider supplied');
//   }

//   const contactTagPayload: AcContactTagPayload = {
//     contactTag: {
//       contact: activeCampaignContactId,
//       tag: signedTag.id,
//     },
//   };

//   return addTagToContact(contactTagPayload);
// };

// const addNewUsertoList = async (
//   activeCampaignContactId: string,
// ): Promise<AcContactListResponse> => {
//   const contactListPayload: AcContactListPayload = {
//     contactList: {
//       contact: activeCampaignContactId,
//       list: ENVIRONMENT === 'prod' ? MAIN_LIST.id : DEVELOPMENT_LIST.id,
//       status: 1,
//     },
//   };

//   return addContactToList(contactListPayload);
// };

// // @link https://firebase.google.com/docs/functions/auth-events
// export default functions
//   .region(REGION)
//   .auth.user()
//   .onCreate(async (user) => {
//     const { uid, providerData } = user;

//     const [activeCampaignContactId, activeCampaignContactEmail] = await createContactFromUser(user);

//     const { providerId } = providerData[0];
//     await addTagToNewUser(activeCampaignContactId, providerId);
//     await addNewUsertoList(activeCampaignContactId);

//     await setUserInternalConfig(uid, {
//       activeCampaignContactId,
//       providersSentToActiveCampaign: [providerId],
//     });

//     functions.logger.info('Created new contact in ActiveCampaign', {
//       userId: user.uid,
//       userEmail: user.email,
//       activeCampaignContactId,
//       activeCampaignContactEmail,
//     });
//   });
