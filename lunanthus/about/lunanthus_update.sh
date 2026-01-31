#!/bin/bash

REPO_URL="https://github.com/MizuiMiduki/Lunanthus.git"
REMOTE_NAME="lunanthus_origin"

PATHS=(
  "lunanthus/spa/"
  "lunanthus/pwa/sw.js"
  "lunanthus/router.js"
 "lunanthus/about/lunanthus_about.json"
)

if ! git remote get-url lunanthus_origin >/dev/null 2>&1; then
  git remote add lunanthus_origin https://github.com/MizuiMiduki/Lunanthus.git
fi

git fetch $REMOTE_NAME

git checkout $REMOTE_NAME/main -- "${PATHS[@]}"

echo "Update complete!"
