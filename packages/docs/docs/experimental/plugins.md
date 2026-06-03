# Plugins

:::warning
This is an **experimental feature**. That means we're still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please comment on [this feedback issue](https://github.com/actualbudget/actual/issues/5950) or post a message in the Discord.
:::

:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](/docs/experimental/) for instructions to enable experimental features. Use the `nightly` images for the latest implementation.
:::

Back up your data before enabling plugins, and only install plugins from sources you trust.

The current plugin system supports installable packages that can add frontend code, sync-server code, or both. The active implementation is focused on plugin-backed bank sync providers. Broader extension points exist in the codebase as planned future capabilities, but they are not enabled in the current MVP.

## Enable plugins

Plugins have two separate switches:

- The Actual client experimental feature flag controls whether the Plugins page and plugin frontend code load.
- The sync server preference controls whether sync-server plugin processes load.

For frontend-only plugins, enable the client feature flag:

1. In Actual, go to `Settings -> Show advanced settings -> Experimental features`.
2. Click `I understand the risks, show experimental features`.
3. Enable `Plugins`.

:::warning
If you enable plugins from the Actual client, restart the sync server before installing or loading sync-server plugins. The sync server only loads plugins on startup.
:::

For sync-server or mixed plugins, also enable plugins on the sync server and restart it:

```bash
yarn workspace @actual-app/sync-server enable-plugins
```

To disable sync-server plugins:

```bash
yarn workspace @actual-app/sync-server disable-plugins
```

Restart the sync server after either command. These commands update the server preference `flags.plugins`.

## Disable or remove a plugin

For plugins stored in the browser, go to `More -> Plugins`. Use the pause button to enable or disable a plugin, or the trash button to delete it. Actual reloads the page after changing a local plugin state.

Sync-server plugins are server managed. They appear on the Plugins page, but their row does not expose pause or delete actions. To stop loading sync-server plugins, disable the server plugin preference and restart the sync server. To remove one sync-server plugin, delete its directory or zip file from the sync-server plugins folder and restart the sync server.

## Install plugins from the UI

After enabling the `Plugins` experimental feature, open `More -> Plugins`.

Use `Upload plugin manually` to choose a plugin `.zip` file. Actual reads `manifest.json` from the zip, validates it, and installs it according to its type:

- Frontend-only plugins are stored in the browser's IndexedDB plugin store.
- Sync-server and mixed plugins are uploaded to the configured sync server through `/plugins-api/install`.

Sync-server and mixed plugins require a configured sync server. The install endpoint requires admin access.

The zip must contain `manifest.json`. Frontend files must be under `frontend/`, and sync-server files must be under `syncserver/`.

## Install plugins by dropping files into the plugins folder

Sync-server plugins can also be installed by placing plugin files directly in the sync-server plugins directory.

The directory is:

```text
<ACTUAL_SERVER_FILES>/plugins
```

If `ACTUAL_SERVER_FILES` is not set, it defaults to:

```text
<ACTUAL_DATA_DIR>/server-files/plugins
```

In many Docker installs this is:

```text
/data/server-files/plugins
```

You can drop either:

- A plugin zip file ending in `.zip`.
- A plugin directory containing `manifest.json`.

Then restart the sync server. On startup, the plugin manager scans the plugins directory, validates each manifest, extracts zip plugins to a temporary directory, installs runtime dependencies from `package.json` when present, and starts sync-server plugins as child processes.

If two plugins have the same slug, Actual loads the first one found and skips the duplicate. The slug is the manifest `name` with unsupported characters replaced by `-`.

## How plugins are implemented

The plugin system has three main parts.

The client-side provider loads frontend plugins only when the `plugins` feature flag is enabled. It reads locally stored plugins from IndexedDB, fetches sync-server plugin manifests from `/plugins-api/list`, and merges both lists. Frontend plugin files are served through the plugin service worker under `/plugin-data/<plugin>/<file>`. The plugin frontend entry is loaded with Module Federation.

The sync server exposes `/plugins-api`. When server plugins are enabled, the sync server scans `<ACTUAL_SERVER_FILES>/plugins`, validates plugin manifests, and forks each sync-server plugin entry as a child process. Requests to plugin routes are forwarded to the child process over IPC. Plugin responses are forwarded back as HTTP responses.

The bank sync bridge exposes standard routes for plugin bank sync providers:

```text
GET  /plugins-api/bank-sync/list
GET  /plugins-api/bank-sync/:providerSlug/status
POST /plugins-api/bank-sync/:providerSlug/status
POST /plugins-api/bank-sync/:providerSlug/accounts
POST /plugins-api/bank-sync/:providerSlug/transactions
POST /plugins-api/bank-sync/:providerSlug/secret
```

Additional provider-specific routes can be called through:

```text
/plugins-api/bank-sync/:providerSlug/<route>
```

Plugin routes can require `anonymous`, `authenticated`, or `admin` access. If a route omits `auth`, it defaults to authenticated access.

## Manifest format

Every plugin must include `manifest.json`.

```json
{
  "name": "example-bank-sync",
  "version": "0.0.1",
  "description": "Example bank sync plugin",
  "author": "Example Author",
  "type": "mixed",
  "frontend": {
    "entry": "frontend/mf-manifest.json"
  },
  "syncserver": {
    "entry": "syncserver/index.js",
    "routes": [
      {
        "path": "/status",
        "methods": ["GET", "POST"],
        "auth": "authenticated",
        "description": "Check provider status"
      }
    ],
    "bankSync": {
      "enabled": true,
      "displayName": "Example Bank",
      "description": "Link accounts with Example Bank.",
      "requiresAuth": true,
      "setup": {
        "type": "plugin"
      },
      "endpoints": {
        "status": "/status",
        "accounts": "/accounts",
        "transactions": "/transactions"
      }
    }
  }
}
```

`type` must be one of:

- `frontend`: loads only frontend plugin code.
- `syncserver`: loads only sync-server plugin code.
- `mixed`: loads frontend code and sync-server code.

If the plugin has frontend code, `frontend.entry` is required. If the plugin has sync-server code, `syncserver.entry` is required. Bank sync setup with `"type": "plugin"` requires a `mixed` plugin because the setup UI is rendered by the frontend plugin.

## Create a bank sync plugin

The current plugin API is best suited to bank sync providers. The Enable Banking and Pluggy.ai packages are useful references.

A sync-server plugin creates an Express app and attaches the plugin IPC middleware:

```ts
import {
  attachPluginMiddleware,
  saveSecret,
  getSecret,
} from '@actual-app/plugins-core-sync-server';
import express from 'express';

const app = express();
app.use(express.json());
attachPluginMiddleware(app);

app.get('/status', async (req, res) => {
  const secret = await getSecret(req, 'apiKey');
  res.json({ status: 'ok', data: { configured: Boolean(secret.value) } });
});

app.post('/configure', async (req, res) => {
  await saveSecret(req, 'apiKey', req.body.apiKey);
  res.json({ status: 'ok', data: { configured: true } });
});
```

Secrets are namespaced by plugin slug automatically. If the request includes `x-actual-file-id` or a `fileId` query/body value, secrets are scoped to that budget file.

A frontend plugin exports an `ActualPluginEntry` and registers bank sync setup and link UI:

```tsx
import { initializePlugin } from '@actual-app/plugins-core';
import type { ActualPlugin, ActualPluginEntry } from '@actual-app/plugins-core';

const pluginEntry: ActualPluginEntry = () => {
  const plugin: ActualPlugin = {
    name: 'example-bank-sync',
    version: '0.0.1',
    install() {},
    uninstall() {},
    activate(context) {
      const unregisterSetup = context.registerBankSyncProviderSetup(
        'example-bank-sync',
        props => <ExampleSetup {...props} />,
      );

      const unregisterLink = context.registerBankSyncProviderLink(
        'example-bank-sync',
        props => <ExampleLink {...props} />,
      );

      return () => {
        unregisterSetup();
        unregisterLink();
      };
    },
    deactivate() {},
  };

  return initializePlugin(plugin);
};

export default pluginEntry;
```

The setup renderer receives `callProvider`, `setSecret`, `fileId`, `onSuccess`, `onError`, and `close`. The link renderer receives `callProvider`, `openExternalUrl`, `selectExternalAccounts`, `fileId`, and account-linking callbacks.

## Build a plugin zip

A distribution zip should use this layout:

```text
manifest.json
package.json
frontend/
  mf-manifest.json
  ...
syncserver/
  index.js
```

For mixed bank sync plugins in this repository, the usual build flow is:

```bash
yarn workspace @actual-app/bank-sync-plugin-enablebanking build
```

That build compiles TypeScript, bundles the sync-server entry with esbuild, builds the frontend Module Federation bundle with Vite, writes `manifest.json`, and creates the zip.

During local plugin development, the Plugins page also exposes a development plugin URL field when Actual runs in development mode. The URL can point to `manifest.json` or to a directory containing `manifest.json`. If the dev plugin includes sync-server code, Actual registers it with the sync server through `/plugins-api/dev/register`.

## Current capabilities

The current implementation supports:

- Frontend, sync-server, and mixed plugin manifests.
- Manual zip upload from the Plugins page.
- Loading sync-server plugins from zip files or directories in the sync-server plugins folder.
- Module Federation based frontend plugin loading.
- Express-based sync-server plugin routes over IPC.
- Route auth levels: `anonymous`, `authenticated`, and `admin`.
- Plugin-specific secret storage through the sync server secrets service.
- Plugin bank sync providers with setup, account-linking, account-list, status, and transaction endpoints.
- A CORS proxy for plugin store and GitHub release access, guarded by an allowlist.
- Development plugin loading from a local manifest URL.

## Planned future capabilities

Several broader plugin capabilities are present as part of a fuller plugin system, but are not currently enabled. These include:

- Custom app routes.
- Slot content in locations such as the main menu, more menu, account sidebar areas, and topbar.
- Plugin modals and navigation helpers outside the bank sync flow.
- Plugin event subscriptions for payees, categories, and accounts.
- Plugin dashboard widgets.
- Plugin-provided themes and theme color overrides (to be removed in favor of custom themes).
- Plugin databases, transactions, metadata, migrations, and AQL queries.
- Spreadsheet helpers and filter-building helpers.

Treat these as future directions, not as stable APIs.
