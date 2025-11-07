# The Actual Project Structure

Actual is made up of lots of different _packages_. This article covers how they all fit together to form the project you know as Actual Budget.

All of the repositories can be found in the [Actual Budget](https://github.com/actualbudget) organization on GitHub, within that organization you will then find the following repositories

- [Actual & Actual Server](https://github.com/actualbudget/actual)
- [docs](https://github.com/actualbudget/docs)

## Actual

This repository holds all of the front end code for the Actual Budget application, along with the syncing engine and the importers for YNAB4 and YNAB5 (also commonly referred to as nYNAB).

```
├── actual
    └── Packages
        └── api
        └── crdt
        └── desktop-client
        └── desktop-electron
        └── loot-core
        └── sync-server
        ...
│
```

### Desktop Client

While this is called Desktop Client, this actually has nothing to do with the desktop, this package forms the front end code for the Actual Web app, the code that you see when you load Actual in your browser.

### Desktop Electron

This is the source code for the Desktop application. It's a wrapper that allows for a stable use of the Actual Web App locally with or without the internet or a sync-server. It is unlikely you will need to make changes here.

### Loot Core

The shared underlying functionality component used by both the web/desktop frontend and the in-browser database server.

### Sync Server

The Sync Server, also known as Actual Server, holds all of the code for the synchronization element of the Actual Budget application. Actual server has a dependency of Actual so when you deploy Actual Server to your hosting method of choice, be that Fly, Local etc. and run `yarn build:server` and `yarn install`, the Actual client will be installed as a dependency into the Actual Server deployment.

You can see this in the [package.json](https://github.com/actualbudget/actual/blob/master/packages/sync-server/package.json) file;

```json
"dependencies": {
    "@actual-app/web": "workspace:*",
    // rest of dependencies...
  },
```

The workspace reference ensures that changes to @actual-app/web are reflected in your server deployment. If you see any discrepencies it means you need to run `yarn build:server` to compile the latest.
