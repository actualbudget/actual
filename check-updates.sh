#!/bin/bash

# Simple script to check for new Actual Budget releases
# Usage: ./check-updates.sh [--update]

REPO_URL="https://api.github.com/repos/actualbudget/actual/releases/latest"
UPDATE_FLAG=${1:-""}

# Get current commit
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Fetch latest release
RELEASE_INFO=$(curl -s "$REPO_URL")
LATEST_TAG=$(echo "$RELEASE_INFO" | grep '"tag_name"' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')

if [ -z "$LATEST_TAG" ]; then
    echo "❌ Could not fetch latest release"
    exit 1
fi

# Get latest tag commit
git fetch origin --tags >/dev/null 2>&1
LATEST_TAG_COMMIT=$(git rev-list -n 1 "$LATEST_TAG" 2>/dev/null || echo "unknown")

echo "📦 Current: $(git describe --tags --always 2>/dev/null || echo $CURRENT_COMMIT)"
echo "🚀 Latest:  $LATEST_TAG"

if [ "$CURRENT_COMMIT" != "$LATEST_TAG_COMMIT" ]; then
    echo "🆕 New version available!"
    
    if [ "$UPDATE_FLAG" = "--update" ]; then
        echo "🔄 Starting update..."
        ./update-actual.sh
    else
        echo "💡 Run './update-actual.sh' to update"
        echo "💡 Or run './check-updates.sh --update' to update automatically"
    fi
    exit 2  # Exit code 2 means update available
else
    echo "✅ Already up to date"
    exit 0
fi
