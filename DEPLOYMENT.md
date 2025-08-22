# Actual Budget - Custom Fly.io Deployment

This repository contains a customized deployment of [Actual Budget](https://actualbudget.org/) on Fly.io, built from source to allow for custom modifications.

## 🚀 Deployment Overview

- **Platform**: Fly.io
- **App Name**: `actual-server-web`
- **Region**: `gru` (São Paulo, Brazil)
- **Build**: Custom from source using `sync-server.Dockerfile`
- **URL**: https://actual-server-web.fly.dev

## 📁 Key Files

- `fly.toml` - Fly.io configuration with Docker layer caching
- `sync-server.Dockerfile` - Multi-stage Docker build for the application
- `packages/` - Source code where customizations can be made
- `update-actual.sh` - Automated update script
- `check-updates.sh` - Quick update checker

## 🔧 Making Customizations

1. **Edit source code** in the `packages/` directory:
   - `packages/desktop-client/` - Frontend UI changes
   - `packages/loot-core/` - Core application logic
   - `packages/sync-server/` - Server-side changes

2. **Test locally** (optional):
   ```bash
   ./test-local.sh
   ```

3. **Deploy changes**:
   ```bash
   fly deploy
   ```

## 📦 Update Management

### Available Scripts

#### `./check-updates.sh` - Quick Update Check
Shows current vs latest version from GitHub releases.

```bash
# Just check for updates
./check-updates.sh

# Check and update if new version available
./check-updates.sh --update
```

**Output example:**
```
📦 Current: v25.8.0
🚀 Latest:  v25.8.0
✅ Already up to date
```

#### `./update-actual.sh` - Full Update Process
Comprehensive update script that:
- ✅ Checks for new GitHub releases
- 🔄 Creates backup branches
- 📥 Updates code to latest release
- 🚀 Deploys to Fly.io
- ✅ Verifies deployment
- 🔙 Handles rollback on failure

```bash
# Regular update (only if new version exists)
./update-actual.sh

# Force update (useful for testing)
./update-actual.sh force
```

### Update Process Details

1. **Safety First**: Creates backup branch before updating
2. **Stash Protection**: Automatically stashes local changes
3. **Dependency Management**: Runs `yarn install` for new dependencies
4. **Local Testing**: Optional Docker build test
5. **Deployment**: Deploys to Fly.io with verification
6. **Rollback**: Automatic rollback on deployment failure
7. **Logging**: Detailed logs saved to `update.log`

## 🛠️ Manual Deployment Commands

```bash
# Deploy current code
fly deploy

# Check app status
fly status

# View logs
fly logs --no-tail

# SSH into the running app
fly ssh console

# Scale the app
fly scale count 1

# Check app info
fly info
```

## 📊 Configuration

### Environment Variables (in `fly.toml`)
- `PORT=5006` - Application port
- `ACTUAL_HOSTNAME=0.0.0.0` - Listen on all interfaces
- `TINI_SUBREAPER=1` - Process management

### Build Configuration
- **Dockerfile**: `sync-server.Dockerfile`
- **Caching**: Docker layer caching enabled (`BUILDKIT_INLINE_CACHE=1`)
- **Build Context**: Entire repository for full customization

### Persistent Storage
- **Volume**: `actual_data` mounted at `/data`
- **Purpose**: Stores budget data, survives deployments
- **Size**: 1GB (configurable)

## 🔍 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check build logs
fly logs --no-tail

# Test build locally
docker build -f sync-server.Dockerfile -t actual-test .
```

**App Not Responding:**
```bash
# Check if app is running
fly status

# View recent logs
fly logs --no-tail

# Restart the app
fly apps restart actual-server-web
```

**Update Script Issues:**
```bash
# Check Git status
git status

# View update logs
cat update.log

# Manual rollback
git checkout main  # or your previous branch
fly deploy
```

### Rollback Process

If an update fails or causes issues:

1. **Automatic Rollback**: The update script handles this automatically
2. **Manual Rollback**:
   ```bash
   # List backup branches
   git branch | grep backup-

   # Checkout backup branch
   git checkout backup-YYYYMMDD-HHMMSS

   # Deploy previous version
   fly deploy
   ```

## 📈 Monitoring

- **Fly.io Dashboard**: https://fly.io/apps/actual-server-web/monitoring
- **App URL**: https://actual-server-web.fly.dev
- **Health Check**: `curl -I https://actual-server-web.fly.dev`

## 💰 Cost Optimization

- **Current Setup**: ~$1.50/month
- **Caching**: Reduces build times and costs
- **Single Instance**: Sufficient for personal use
- **Shared CPU**: Cost-effective for low traffic

## 🔐 Security Notes

- Budget data stored in encrypted persistent volume
- HTTPS enforced by Fly.io
- No sensitive data in environment variables
- Regular updates ensure security patches

## 📚 Additional Resources

- [Actual Budget Documentation](https://actualbudget.org/docs)
- [Fly.io Documentation](https://fly.io/docs/)
- [Original Actual Budget Repository](https://github.com/actualbudget/actual)
- [Fly.io Deployment Guide](https://actualbudget.org/docs/install/fly)

---

**Last Updated**: August 2025  
**Actual Budget Version**: v25.8.0  
**Deployment Status**: ✅ Active
