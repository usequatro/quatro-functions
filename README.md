# Quatro Firebase Functions

All code is inside [`src`](src). See [`index.ts`](src/index.ts) for currently available endpoints and scheduled functions.

## Local development

- Run local emulator: `npm run serve`
- Firebase Functions are regular functions exported from `src/index.ts`

## Description

- Recurring task auto-creation.
- Prototype of Slack bot prototype. See [`functions/src/slack`](functions/src/slack)

## Firebase Environments

There are 2 Firebase environments.

- `dev`, for development environments, with Firebase project `quatro-dev-88030`
- `prod`, with Firebase project `tasket-project`

You can check which one you have active locally by running `firebase use`. To switch, use `firebase use [dev|prod]`

## Environment variables

To check what the environment variables are in the cloud, use `firebase functions:config:get`

Environment variables aren't tracked in source control or locally. Simply update them in the different environments using `firebase functions:config:set [key]=[value]`. Note the key can be nested, like `activeCampaign.url`.

[Documentation: Firebase Functions Environment Configuration](https://firebase.google.com/docs/functions/config-env)

## Emulator

Initial setup:

1. Download the environment variables for the Firebase Emulator with `firebase functions:config:get > .runtimeconfig.json`. Then run `export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/.runtimeconfig.json"`. This is good for emulator, but open a new terminal for deploying so it doesn't use them.

To work with HTTP functions with functions pointing to a deployed Firebase project,

1. On a different terminal, on this repository, run `npm run build-watch`
2. Run `firebase emulators:start`

To work with rest of the application

1. On the `quatro-web-client` repository, run `firebase emulators:start`
2. On a different terminal, on this repository, run `npm run build-watch`

Note that the emulator is fairly recent and there are some issues with it. Notably, the callable function `storeAuthCode` doesn't work as expected there, so you might need to copy tokens from the real dev environment for the Google Calendar sync to work.

## Deploying

Check before which environment you're deploying with `firebase use`. Then:

- All functions: `npm run deploy` or `firebase deploy --only functions`
- Only one function: `firebase deploy --only functions:[fname]`
- Multiple functions: `firebase deploy --only functions:[fname1],functions:[fname2]`

## Logging

We use the Firebase Functions Logger ([documentation](https://firebase.google.com/docs/functions/writing-and-viewing-logs), [API reference](https://firebase.google.com/docs/reference/functions/logger_)).
