#!/bin/bash

# Notifies that the deploy has completed

LATEST_COMMIT=$(git log --pretty=format:"%h - %an, %ar: \\\"%s\\\"" -1);

if [[ "$GCLOUD_PROJECT" == "quatro-dev-88030" ]]; then
    ./scripts/messageSlack.sh ":canoe:" "Deployed to DEVELOPMENT - ${LATEST_COMMIT}"
elif [[ "$GCLOUD_PROJECT" == "tasket-project" ]]; then
    ./scripts/messageSlack.sh ":rocket:" "Deployed to PRODUCTION - ${LATEST_COMMIT}"
else
    printf "Unknown Firebase project ${BRed}$GCLOUD_PROJECT${Color_Off}\n";
    exit 1;
fi
