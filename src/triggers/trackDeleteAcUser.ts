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

    const userConfig = await getUserConfig(uid);
    if (!userConfig) {
      throw new Error(`User config for user ${uid} not found`);
    }
    const { activeCampaignId } = userConfig;

    await deleteContact(activeCampaignId);
    await deleteUserConfig(uid);
  });
