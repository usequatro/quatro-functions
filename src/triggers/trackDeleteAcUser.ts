import * as functions from 'firebase-functions';

import { deleteContact } from '../utils/activeCampaignApi';
import REGION from '../constants/region';
import {
  deleteUserInternalConfig,
  getUserInternalConfig,
} from '../repositories/userInternalConfigs';

// @link https://firebase.google.com/docs/functions/auth-events
export default functions
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    const { uid } = user;

    const userInternalConfig = await getUserInternalConfig(uid);
    if (!userInternalConfig) {
      functions.logger.info('Skipping because user internal config not found', {
        userId: user.uid,
        userEmail: user.email,
      });
      return;
    }
    const { activeCampaignId } = userInternalConfig;
    if (activeCampaignId) {
      await deleteContact(activeCampaignId);
      functions.logger.info('Deleted ActiveCampaign contact for user', {
        userId: user.uid,
        userEmail: user.email,
        activeCampaignId,
      });
    } else {
      functions.logger.info('Skipping because no ActiveCampaign contact ID', {
        userId: user.uid,
        userEmail: user.email,
      });
    }
    await deleteUserInternalConfig(uid);
  });
