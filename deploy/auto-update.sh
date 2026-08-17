#!/bin/bash
# Pulls the deployed branch and rebuilds the container only if something
# actually changed. Meant to be run on a schedule (see rolloff-autoupdate.timer)
# directly on the Pi — not inside the container.
set -euo pipefail

REPO_DIR="/opt/stacks/rolloff-tracker"
BRANCH="main"

cd "$REPO_DIR"

git fetch origin "$BRANCH"

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "$(date -Is) up to date ($LOCAL)"
  exit 0
fi

echo "$(date -Is) updating $LOCAL -> $REMOTE"
git pull origin "$BRANCH"
export GIT_SHA="$(git rev-parse --short HEAD)"
export BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose up -d --build
echo "$(date -Is) deployed $REMOTE"
