import { array, object, string } from 'joi';

export interface UserInternalConfig {
  activeCampaignId?: string;
  // We keep a list of providers we syched to avoid posting tags twice or needing to check for that
  providersSentToActiveCampaign?: string[];

  // gapi credentials for interacting with user's calendar from backend
  gapiRefreshToken?: string;
  gapiAccessToken?: string;
}

export const userInternalConfigSchema = object({
  activeCampaignId: string().allow(null),
  providersSentToActiveCampaign: array().items(string()).default([]),
  gapiRefreshToken: string().allow(null),
  gapiAccessToken: string().allow(null),
});
