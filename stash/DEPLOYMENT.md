# Stash - Deployment Guide (Coolify + Hostinger)

## Quick Start (Docker Compose)

```bash
cd stash
docker compose up -d
```

App runs on `http://localhost:3000`. Default PIN: `1234`.

## Deploy on Coolify + Hostinger VPS

### 1. Install Coolify on your Hostinger VPS

```bash
ssh root@your-hostinger-ip
curl -fsSL https://get.coollabs.io/install.sh | sh
```

### 2. Access Coolify Dashboard

Go to `http://your-hostinger-ip:8000` and create your account.

### 3. Deploy Stash

1. In Coolify: **New Resource > Public Repository**
2. Repository: `https://github.com/executiveusa/actual-stash`
3. Branch: `claude/add-savings-categories-QuSGe`
4. Build Pack: **Dockerfile**
5. Dockerfile Location: `stash/Dockerfile`
6. Base Directory: `stash`
7. Port: `3000`

### 4. Configure

Add environment variable:
- `STASH_PIN` = your chosen PIN (default: 1234)

### 5. Persistent Storage

Add a volume mount in Coolify:
- Container path: `/app/data`

This stores the SQLite database. Your data survives container restarts.

### 6. Custom Domain + SSL

1. In Coolify: Application > Settings > Domains
2. Add your domain (e.g., `stash.yourdomain.com`)
3. Point DNS (A record) to your Hostinger VPS IP
4. Coolify auto-generates Let's Encrypt SSL certificate

## Architecture

```
Browser → Express Server (port 3000)
              ├── /api/*  → SQLite database (persistent)
              └── /*      → Static React app (dist/)
```

- **Backend**: Express + better-sqlite3
- **Frontend**: React + Vite (built to static files)
- **Auth**: PIN-based with SHA-256 hashing + httpOnly session cookies (30-day expiry)
- **Database**: SQLite with WAL mode (stored in /app/data/stash.db)

## Development

```bash
cd stash
npm install
npm run dev
```

This starts both the Vite dev server (port 5173) and the API server (port 3000) with hot reload.
