# @actual-app/plugins-core-sync-server

Core plugin utilities for Actual sync-server plugin authors.

## Overview

This package provides the middleware and utilities needed to create plugins for the Actual sync-server. Plugin authors can use this to build Express-based plugins that communicate with the sync-server via IPC (Inter-Process Communication).

## Installation

```bash
npm install @actual-app/plugins-core-sync-server express
```

## Usage

### Basic Plugin Setup

Create a plugin that responds to HTTP requests through the sync-server:

```typescript
import express from 'express';
import { attachPluginMiddleware } from '@actual-app/plugins-core-sync-server';

const app = express();

// Use JSON middleware for parsing request bodies
app.use(express.json());

// Attach the plugin middleware to enable IPC communication
attachPluginMiddleware(app);

// Define your routes as you normally would
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from plugin!' });
});

app.post('/data', (req, res) => {
  const { name } = req.body;
  res.json({ received: name });
});

// Note: You don't need to call app.listen()
// The plugin runs as a forked process and communicates via IPC
console.log('Plugin is ready');
```

### Plugin Manifest

Each plugin must have a `manifest.ts` file for type safety:

```typescript
import { PluginManifest } from '@actual-app/plugins-core-sync-server';

export const manifest: PluginManifest = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  entry: 'dist/index.js',
  author: 'Your Name',
  license: 'MIT',
  routes: [
    {
      path: '/hello',
      methods: ['GET'],
      auth: 'anonymous',
      description: 'Public hello world endpoint',
    },
  ],
};
```

This is automatically converted to `manifest.json` during the build process.

### Project Structure

```
my-plugin/
├── src/
│   ├── index.ts          # Main plugin code
│   └── manifest.ts       # TypeScript manifest (with type safety)
├── dist/
│   ├── index.js          # Compiled JavaScript
│   └── manifest.js       # Compiled manifest (for build process)
├── manifest.json         # JSON manifest (generated)
├── package.json
├── tsconfig.json
├── scripts/
│   ├── build-manifest.js # Converts TS manifest to JSON
│   └── build-zip.js      # Creates distribution zip
└── README.md
```

The build process creates: `{packageName}.{version}.zip`

### Accessing Plugin Routes

Once your plugin is loaded by the sync-server, it will be accessible via:

```
http://your-server/plugins-api/<plugin-slug>/<your-route>
```

For example, if your plugin slug is `my-plugin` and you have a route `/hello`:

```
http://your-server/plugins-api/my-plugin/hello
```

## API

### `attachPluginMiddleware(app: Express): void`

Attaches the plugin middleware to your Express app. This sets up IPC communication with the sync-server.

**Parameters:**

- `app`: Your Express application instance

**Example:**

```typescript
import express from 'express';
import { attachPluginMiddleware } from '@actual-app/plugins-core-sync-server';

const app = express();
attachPluginMiddleware(app);
```

## Types

The package exports TypeScript types for plugin development:

- `PluginRequest`: IPC request structure from sync-server
- `PluginResponse`: IPC response structure to sync-server
- `PluginError`: IPC error structure
- `PluginReady`: Plugin ready message structure
- `PluginManifest`: Plugin manifest file structure
- `PluginRoute`: Route configuration for manifest
- `AuthLevel`: Authentication level type ('anonymous', 'authenticated', 'admin')
- `PluginExpressRequest`: Express Request with plugin context
- `PluginExpressResponse`: Express Response type
- `UserInfo`: User information extracted from request

## How It Works

1. The sync-server loads plugins from the `plugins` directory
2. Each plugin is forked as a child process
3. HTTP requests to `/plugins-api/<plugin-slug>/*` are intercepted by the sync-server
4. The sync-server sends the request data to the plugin via IPC
5. The plugin's Express app processes the request
6. The plugin sends the response back to sync-server via IPC
7. The sync-server returns the response to the original HTTP client

This architecture allows plugin authors to write standard Express code without worrying about IPC details.

## License

MIT
