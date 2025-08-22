#!/bin/bash

# Actual Budget Auto-Update Script
# Checks for new releases and updates Fly.io deployment

set -e  # Exit on any error

# Configuration
REPO_URL="https://api.github.com/repos/actualbudget/actual/releases/latest"
CURRENT_DIR="/Users/caylent/code/personal/actual"
LOG_FILE="$CURRENT_DIR/update.log"
FORCE_UPDATE=${1:-false}  # Pass 'force' as first argument to force update

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if we're in the right directory
if [ ! -f "fly.toml" ] || [ ! -d "packages" ]; then
    error "Not in Actual Budget directory. Please run from $CURRENT_DIR"
    exit 1
fi

log "Starting Actual Budget update check..."

# Get current local version/commit
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

log "Current commit: $CURRENT_COMMIT"
log "Current branch: $CURRENT_BRANCH"

# Fetch latest release info from GitHub
log "Fetching latest release information..."
RELEASE_INFO=$(curl -s "$REPO_URL" || {
    error "Failed to fetch release information from GitHub"
    exit 1
})

# Parse release information
LATEST_TAG=$(echo "$RELEASE_INFO" | grep '"tag_name"' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')
RELEASE_NAME=$(echo "$RELEASE_INFO" | grep '"name"' | sed -E 's/.*"name": "([^"]+)".*/\1/')
RELEASE_DATE=$(echo "$RELEASE_INFO" | grep '"published_at"' | sed -E 's/.*"published_at": "([^"]+)".*/\1/')

if [ -z "$LATEST_TAG" ]; then
    error "Could not parse latest release tag"
    exit 1
fi

log "Latest release: $LATEST_TAG ($RELEASE_NAME)"
log "Published: $RELEASE_DATE"

# Check if we need to update
NEEDS_UPDATE=false

# Get the commit hash of the latest tag
git fetch origin --tags >/dev/null 2>&1 || {
    warning "Could not fetch tags from origin"
}

LATEST_TAG_COMMIT=$(git rev-list -n 1 "$LATEST_TAG" 2>/dev/null || echo "unknown")

if [ "$FORCE_UPDATE" = "force" ]; then
    log "Force update requested"
    NEEDS_UPDATE=true
elif [ "$CURRENT_COMMIT" != "$LATEST_TAG_COMMIT" ]; then
    log "New version available: $LATEST_TAG"
    NEEDS_UPDATE=true
else
    success "Already up to date with latest release: $LATEST_TAG"
fi

if [ "$NEEDS_UPDATE" = false ]; then
    log "No update needed. Exiting."
    exit 0
fi

# Backup current state
log "Creating backup of current state..."
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BACKUP_BRANCH" >/dev/null 2>&1 || {
    warning "Could not create backup branch"
}
git checkout "$CURRENT_BRANCH" >/dev/null 2>&1

# Update to latest release
log "Updating to latest release: $LATEST_TAG"

# Stash any local changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    log "Stashing local changes..."
    git stash push -m "Auto-stash before update to $LATEST_TAG" >/dev/null 2>&1
    STASHED=true
else
    STASHED=false
fi

# Checkout the latest tag
git fetch origin >/dev/null 2>&1
git checkout "$LATEST_TAG" >/dev/null 2>&1 || {
    error "Failed to checkout $LATEST_TAG"
    exit 1
}

# Install/update dependencies
log "Installing dependencies..."
yarn install --frozen-lockfile >/dev/null 2>&1 || {
    error "Failed to install dependencies"
    exit 1
}

# Test build locally (optional)
log "Testing build locally..."
if command -v docker >/dev/null 2>&1; then
    docker build -f sync-server.Dockerfile -t actual-test . >/dev/null 2>&1 || {
        warning "Local Docker build failed, but continuing with deployment"
    }
else
    warning "Docker not available for local testing"
fi

# Deploy to Fly.io
log "Deploying to Fly.io..."
fly deploy || {
    error "Deployment failed!"
    
    # Rollback on failure
    log "Rolling back to previous version..."
    git checkout "$CURRENT_BRANCH" >/dev/null 2>&1
    
    if [ "$STASHED" = true ]; then
        git stash pop >/dev/null 2>&1
    fi
    
    exit 1
}

# Verify deployment
log "Verifying deployment..."
sleep 10  # Wait for deployment to stabilize

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://actual-server-web.fly.dev || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    success "Deployment successful! App is responding."
    success "Updated from commit $CURRENT_COMMIT to $LATEST_TAG"
    
    # Clean up backup branch if everything is working
    git branch -D "$BACKUP_BRANCH" >/dev/null 2>&1 || true
    
    # Update to track the new tag
    git checkout -b "release-$LATEST_TAG" >/dev/null 2>&1 || true
    
else
    error "Deployment verification failed (HTTP $HTTP_STATUS)"
    warning "App may not be responding correctly"
    exit 1
fi

# Restore stashed changes if any (on the new version)
if [ "$STASHED" = true ]; then
    log "Attempting to restore stashed changes..."
    git stash pop >/dev/null 2>&1 || {
        warning "Could not automatically restore stashed changes"
        warning "Check 'git stash list' for your changes"
    }
fi

success "Update completed successfully!"
log "Current version: $LATEST_TAG"
log "Backup branch created: $BACKUP_BRANCH (in case rollback is needed)"
log "Update log saved to: $LOG_FILE"
