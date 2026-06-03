# @actual-app/plugins-core-sync-server

Sync-server utilities for Actual plugin authors.

## Overview

This package provides the middleware, IPC types, secret helpers, and sync-server
manifest types used by plugins that run server-side code inside Actual's
sync-server plugin host.

Use this package for the sync-server portion of a plugin. Frontend plugin
contracts live in `@actual-app/plugins-core`, and a plugin can include both
frontend and sync-server entries by using a `mixed` manifest.

## Installation

```bash
npm install @actual-app/plugins-core-sync-server express
```

## Basic Sync-Server Plugin

Create an Express app and attach the plugin middleware. The sync-server starts
the plugin as a child process and forwards plugin HTTP requests over IPC, so the
plugin should not call `app.listen()`.

```typescript
import express from 'express';
import { attachPluginMiddleware } from '@actual-app/plugins-core-sync-server';

const app = express();

app.use(express.json());
attachPluginMiddleware(app);

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from plugin!' });
});
```

## Manifest Shape

Plugins use the shared manifest shape from `@actual-app/plugins-core`.
Sync-server-only plugins set `type: 'syncserver'` and provide
`syncserver.entry`:

```typescript
import type { PluginManifest } from '@actual-app/plugins-core-sync-server';

export const manifest: PluginManifest = {
  name: 'my-sync-plugin',
  version: '1.0.0',
  description: 'My sync-server plugin',
  type: 'syncserver',
  syncserver: {
    entry: 'syncserver/index.js',
    routes: [
      {
        path: '/hello',
        methods: ['GET'],
        auth: 'anonymous',
        description: 'Public hello world endpoint',
      },
    ],
  },
};
```

Plugins that also provide UI use `type: 'mixed'` and include a frontend entry:

```typescript
import type { PluginManifest } from '@actual-app/plugins-core-sync-server';

export const manifest: PluginManifest = {
  name: 'my-provider-plugin',
  version: '1.0.0',
  type: 'mixed',
  frontend: {
    entry: 'frontend/index.js',
  },
  syncserver: {
    entry: 'syncserver/index.js',
    routes: [
      {
        path: '/accounts',
        methods: ['GET'],
        auth: 'authenticated',
      },
    ],
  },
};
```

Legacy top-level fields such as `entry`, `routes`, and `bankSync` remain typed
for migration compatibility, but new plugins should use the nested `frontend`
and `syncserver` sections.

## Project Structure

A sync-server-only plugin package usually builds compiled server code into a
server output directory and emits a `manifest.json` at the package root:

```text
my-sync-plugin/
  src/
    index.ts
    manifest.ts
  dist/
    index.js
    manifest.js
  manifest.json
  package.json
  tsconfig.json
```

A mixed plugin includes both server and frontend build outputs in its
distribution zip:

```text
my-provider-plugin/
  src/
    index.ts
    manifest.ts
  frontend/
    src/
      index.tsx
  dist/
    bundle.js
  frontend-build/
    index.js
  manifest.json
  package.json
```

The plugin zip should include `manifest.json` plus the files referenced by the
manifest entries, for example `syncserver/index.js` and `frontend/index.js`.

## Accessing Plugin Routes

Once a sync-server plugin is loaded, its routes are exposed through:

```text
http://your-server/plugins-api/<plugin-slug>/<your-route>
```

For example, a plugin slug of `my-sync-plugin` with route `/hello` is available
at:

```text
http://your-server/plugins-api/my-sync-plugin/hello
```

## API

### `attachPluginMiddleware(app: Express): void`

Attaches middleware that receives forwarded requests from the sync-server over
IPC and sends Express responses back to the host process.

```typescript
import express from 'express';
import { attachPluginMiddleware } from '@actual-app/plugins-core-sync-server';

const app = express();
attachPluginMiddleware(app);
```

### Secret Helpers

The package also exports secret helpers for sync-server plugin code:

```typescript
import {
  getSecret,
  getSecrets,
  saveSecret,
  saveSecrets,
} from '@actual-app/plugins-core-sync-server';
```

Secrets are namespaced by the sync-server runtime using plugin context.

## Types

The package exports TypeScript types for sync-server plugin development:

- `PluginRequest`: IPC request from sync-server to plugin
- `PluginResponse`: IPC response from plugin to sync-server
- `PluginError`: IPC error response
- `PluginReady`: plugin ready message
- `PluginManifest`: plugin manifest structure
- `PluginRoute`: sync-server route configuration
- `AuthLevel`: route authentication level
- `BankSyncConfig`: optional bank sync route configuration
- `BankSyncError`: standardized bank sync error response
- `PluginExpressRequest`: Express request with plugin context
- `PluginExpressResponse`: Express response type
- `UserInfo`: user information forwarded by sync-server

## How It Works

1. The sync-server loads plugin zips or folders from the configured plugins
   directory.
2. If the manifest has a sync-server entry, the sync-server forks that entry as
   a child process.
3. Requests to `/plugins-api/<plugin-slug>/*` are forwarded to the child process
   over IPC.
4. `attachPluginMiddleware` adapts the IPC request into a normal Express
   request.
5. The plugin response is sent back over IPC and returned to the HTTP client.

This lets plugin authors write normal Express handlers while the sync-server
runtime handles process management and request forwarding.
