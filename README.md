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

You can check which one you have active locally by running firebase use. To switch, use firebase use [default|prod]

## Environment variables

To check what the environment variables are in the cloud, use `firebase functions:config:get`

Where to get all the env var values from? Ask the team.

## Deploying

- All functions: `npm run deploy` or `firebase deploy --only functions`
- Only one function: `firebase deploy --only functions:[fname]`
- Multiple functions: `firebase deploy --only functions:[fname1],functions:[fname2]`
