# Quatro Firebase Functions

All code is inside [`functions/src`](functions/src). See [`index.ts`](functions/src/index.ts) for currently available endpoints and scheduled functions.

## Description

As of Q4 2019, the systems implemented include:

- Slack bot prototype. See [`functions/src/slack`](functions/src/slack)
- Recurring task auto-creation every morning.
- Data migration examples.

## Deploying changes

```
firebase deploy --only functions
```

More about this in [Firebase's documentation](https://firebase.google.com/docs/functions/manage-functions).
