import * as functions from 'firebase-functions';

import { deleteContact } from '../utils/activeCampaignApi';
import REGION from '../constants/region';
import {
  deleteUserInternalConfig,
  getUserInternalConfig,
} from '../repositories/userInternalConfigs';

// @see https://firebase.google.com/docs/functions/auth-events
export default functions
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    console.log(`▶️ ActiveCampaign user deletion ${user.uid} ${user.email}`);
    const { uid } = user;

    const userInternalConfig = await getUserInternalConfig(uid);
    if (!userInternalConfig) {
      console.log(`User internal config not found  for user ${user.uid} ${user.email}`);
      return;
    }
    const { activeCampaignId } = userInternalConfig;
    if (activeCampaignId) {
      await deleteContact(activeCampaignId);
    }
    await deleteUserInternalConfig(uid);
  });
