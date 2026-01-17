# Architecture Notes

If you wish to contribute to Actual, these details are not essential but can be useful for navigating the structure of the code.

## Overview

When Actual runs, it runs the front-end React-based web app, as well as a local in-browser database server. You may see these informally referred to as 'frontend' and 'backend' - not to be confused with the sync-server or some other type of remote 'backend' (which doesn't exist).

## Runtime Architecture

### Web App

In the web app, the background server runs in a [web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). This allows the database operations to run in a separate thread, keeping the UI responsive.

### Electron App

In the Electron app, the background server runs as a [Node.js child process](https://nodejs.org/api/child_process.html) which communicates with the frontend over [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API). This allows the desktop app to use full Node.js capabilities while maintaining security through process isolation.

Details of the motivation behind the usage of WebSockets in the Electron app can be found in [Pull Request #1003](https://github.com/actualbudget/actual/pull/1003).

## Core Package Structure

The code which is used by this background server, as well as code which is shared across the web app and desktop versions of Actual typically lives inside the `loot-core` package.

### Platform-Specific Exports

The `loot-core` package uses conditional exports to provide platform-specific code:

- **Browser exports**: Code that runs in the web worker or browser environment
- **Node exports**: Code that runs in the Electron background process or Node.js API
- **Shared code**: Code that works in both environments

Platform resolution happens at build time via `package.json` exports. Don't directly reference platform-specific imports (`.api`, `.web`, `.electron`) - use the conditional exports instead.

## Build System

- **Vite**: Used for bundling the web app and desktop client
- **TypeScript**: All code is written in TypeScript with strict type checking
- **Yarn Workspaces**: Monorepo structure managed with Yarn 4

## Data Storage

Actual uses SQLite for local data storage. The database is created from a default template and then migrations are applied to bring it to the current schema version. See the [Database Details](./database.md) documentation for more information.
