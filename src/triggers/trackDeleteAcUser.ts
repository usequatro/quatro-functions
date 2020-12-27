import * as functions from 'firebase-functions';

import { deleteContact } from '../repositories/activeCampaign';
import constants from '../constants/common';
import { deleteUserConfig, getUserConfig } from '../repositories/userConfigs';

// @see https://firebase.google.com/docs/functions/auth-events
export default functions
  .region(constants.googleRegion)
  .auth.user()
  .onDelete(async (user) => {
    const { uid } = user;

    const { activeCampaignId } = await getUserConfig(uid);

    await deleteContact(activeCampaignId);
    await deleteUserConfig(uid);
  });
