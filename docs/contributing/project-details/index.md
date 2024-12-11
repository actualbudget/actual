# The Actual Project Structure

Actual is made up of lots of different _packages_. This article covers how they all fit together to form the project you know as Actual Budget.

All of the repositories can be found in the [Actual Budget](https://github.com/actualbudget) organization on GitHub, within that organization you will then find the following repositories

- [Actual](https://github.com/actualbudget/actual)
- [Actual Server](https://github.com/actualbudget/actual-server)
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
        └── node-libofx
        ...
│
```

### Desktop Client

While this is called Desktop Client, this actually has nothing to do with the desktop, this package forms the front end code for the Actual Web app, the code that you see when you load Actual in your browser.

### Desktop Electron

This is the source code for the Desktop application, in its current state it is not configured to work with the self hosted version of Actual Budget, however the source code is available for this to be completed.

### Loot Core

The shared underlying functionality component used by both the web/desktop frontend and the in-browser database server.

### Node Libofx

## Actual Server

Actual Server holds all of the code for the synchronization element of the Actual Budget application. Actual server has a dependency of Actual so when you pull Actual Server and deploy it to your hosting method of choice, be that Fly, Local etc. and run `yarn install` Actual will be downloaded as a dependency from NPM and installed into the Actual Server deployment.

You can see this in the [package.json](https://github.com/actualbudget/actual-server/blob/master/package.json) file;

```json
"dependencies": {
    "@actual-app/api": "4.1.0",
    "@actual-app/web": "4.1.0",
    "bcrypt": "^5.0.1",
    "better-sqlite3": "^7.5.0",
    "body-parser": "^1.18.3",
    "cors": "^2.8.5",
    "express": "4.17",
    "express-actuator": "^1.8.1",
    "express-response-size": "^0.0.3",
    "node-fetch": "^2.2.0",
    "uuid": "^3.3.2"
  },
```

So, you might see some changes being made in the Actual repository but those changes are not reflected in your deployment despite you having the latest version pulled, why? Because Actual hasn't been updated in [NPM](https://www.npmjs.com/package/@actual-app/web).

Actual is only updated in NPM when a release is created.
