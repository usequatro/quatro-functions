#!/bin/bash

# Notifies that the deploy has completed

if [[ "$GCLOUD_PROJECT" == "quatro-dev-88030" ]]; then
    ./scripts/messageSlack.sh "Deployer" "Functions deployed - DEVELOPMENT 🛶"
elif [[ "$GCLOUD_PROJECT" == "tasket-project" ]]; then
    ./scripts/messageSlack.sh "Deployer" "Functions deployed - PRODUCTION 🚀"
else
    printf "Unknown Firebase project ${BRed}$GCLOUD_PROJECT${Color_Off}\n";
    exit 1;
fi
