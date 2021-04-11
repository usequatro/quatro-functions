import { array, object, string } from 'joi';

export const userInternalConfigSchema = object({
  activeCampaignContactId: string().allow(null),
  providersSentToActiveCampaign: array().items(string()).default([]),
  gapiRefreshToken: string().allow(null),
  gapiAccessToken: string().allow(null),
});
