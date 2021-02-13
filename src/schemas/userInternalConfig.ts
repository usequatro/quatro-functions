import { array, object, string } from 'joi';

export interface UserInternalConfig {
  activeCampaignContactId?: string;
  // We keep a list of providers we syched to avoid posting tags twice or needing to check for that
  providersSentToActiveCampaign?: string[];

  // gapi credentials for interacting with user's calendar from backend
  gapiRefreshToken?: string | null;
  gapiAccessToken?: string | null;
}

export const userInternalConfigSchema = object({
  activeCampaignContactId: string().allow(null),
  providersSentToActiveCampaign: array().items(string()).default([]),
  gapiRefreshToken: string().allow(null),
  gapiAccessToken: string().allow(null),
});
