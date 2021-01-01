export enum FirebaseProjects {
  DEV_PROJECT = 'quatro-dev-88030',
  PROD_PROJECT = 'tasket-project',
}

export enum Environments {
  DEV = 'dev',
  PROD = 'prod',
}

const environment = process.env.GCLOUD_PROJECT as FirebaseProjects;

export default (environment === FirebaseProjects.PROD_PROJECT ? 'prod' : 'dev') as Environments;
