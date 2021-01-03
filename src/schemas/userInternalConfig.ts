import { array, object, string } from 'joi';

export interface UserInternalConfig {
  userId: string;
  activeCampaignId?: string;
  // We keep a list of providers we syched to avoid posting tags twice or needing to check for that
  providersSentToActiveCampaign?: string[];

  // gapi credentials for interacting with user's calendar from backend
  gapiRefreshToken?: string;
  gapiAccessToken?: string;
}

const userInternalConfigSchema = object({
  userId: string().required(),
  activeCampaignId: string().required(),
  providersSentToActiveCampaign: array().items(string()),
});

export const validateUserInternalConfig = (payload: UserInternalConfig): UserInternalConfig => {
  const { value, error } = userInternalConfigSchema.validate(payload);

  if (error) {
    throw new Error(error.message);
  }

  return value;
};
