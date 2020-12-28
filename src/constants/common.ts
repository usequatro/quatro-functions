import { Environments, EnvironmentConstants } from '../types/index';

const environment = process.env.GCLOUD_PROJECT as Environments;

const commonConstants: EnvironmentConstants = {
  env: environment === Environments.PROD_ENVIRONMENT ? 'production' : 'development',
  acBaseUrl: 'https://gpuenteallott.api-us1.com/api/3',
  acApiKey: '53153a7899541ee086b110528a05da7dcee780d611f69931838fc0835c137a13e080956b',
  googleRegion: 'us-east1',
};

export default commonConstants;
