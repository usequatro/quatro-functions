import { object, string } from 'joi';

export interface UserConfig {
  userId: string;
  activeCampaignId: string;
}

export const userConfigSchema = object({
  userId: string().required(),
  activeCampaignId: string().required(),
});

export const validateUserConfig = (payload: UserConfig): UserConfig => {
  const { value, error } = userConfigSchema.validate(payload);

  if (error) {
    throw new Error(error.message);
  }

  return value;
};
