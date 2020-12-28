import { array, object, string } from 'joi';

export interface UserConfig {
  userId: string;
  activeCampaignId: string;
  // We keep a list of providers we syched to avoid posting tags twice or needing to check for that
  providersSentToActiveCampaign: string[];
}

export const userConfigSchema = object({
  userId: string().required(),
  activeCampaignId: string().required(),
  providersSentToActiveCampaign: array().items(string()),
});

export const validateUserConfig = (payload: UserConfig): UserConfig => {
  const { value, error } = userConfigSchema.validate(payload);

  if (error) {
    throw new Error(error.message);
  }

  return value;
};
