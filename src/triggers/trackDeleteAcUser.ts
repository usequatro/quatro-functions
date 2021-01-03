import * as functions from 'firebase-functions';

import { deleteContact } from '../repositories/activeCampaign';
import REGION from '../constants/region';
import { deleteUserConfig, getUserConfig } from '../repositories/userConfigs';

// @see https://firebase.google.com/docs/functions/auth-events
export default functions
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    console.log(`▶️ ActiveCampaign user deletion ${user.uid} ${user.email}`);
    const { uid } = user;

    const userConfig = await getUserConfig(uid);
    if (!userConfig) {
      console.log(`User config not found  for user ${user.uid} ${user.email}`);
      return;
    }
    const { activeCampaignId } = userConfig;
    if (activeCampaignId) {
      await deleteContact(activeCampaignId);
    }
    await deleteUserConfig(uid);
  });
