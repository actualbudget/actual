# Stash Self-Hosted Deployment Guide

## Deploy on Coolify + Hostinger

### 1. Connect to Hostinger VPS
```bash
ssh root@your-hostinger-ip
```

### 2. Install Coolify (one command)
```bash
curl -fsSL https://get.coollabs.io/install.sh | sh
```

### 3. Access Coolify Dashboard
- Go to `http://your-hostinger-ip:3000` or your domain
- Set up your account

### 4. Deploy Stash
1. In Coolify: **Projects > New Project > Public GitHub Repository**
2. Connect your GitHub (executiveusa/actual-stash)
3. Select repository, branch: `claude/add-savings-categories-QuSGe`
4. **Dockerfile**: `stash/Dockerfile`
5. **Publish Port**: 3000
6. Add Environment Variables from your `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

7. **Deploy** — Coolify builds and runs in Docker

### 5. Set Custom Domain
- In Coolify: Applications > Stash > Domains
- Point your Hostinger domain → Coolify (CNAME or proxy)

### 6. SSL/HTTPS
- Coolify auto-generates Let's Encrypt certificates

Done! Your stash app runs on your own server.

## Alternative: Docker Compose Direct
```bash
# On your Hostinger VPS, from stash/ directory:
docker-compose up -d
```
App runs on port 3000 with auto-restart.
