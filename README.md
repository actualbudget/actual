This is the source code for [Actual](https://actualbudget.com), a local-first personal finance tool. It is 100% free and open-source.

If you are only interested in running the latest version, you don't need this repo. You can get the latest version through npm.

More docs are available in the [docs](https://github.com/actualbudget/actual/tree/master/docs) folder.

If you are interested in contributing, or want to know how development works, see [CONTRIBUTING.md](https://github.com/actualbudget/actual/blob/master/CONTRIBUTING.md)

Join the [discord](https://discord.gg/pRYNYr4W5A)!

## Installation

### The easy way: using a server (recommended)

The easiest way to get Actual running is to use the [actual-server](https://github.com/actualbudget/actual-server) project. That is the server for syncing changes across devices, and it comes with the latest version of Actual. The server will provide both the web project and a server for syncing.

```
git clone https://github.com/actualbudget/actual-server.git
cd actual-server
yarn install
yarn start
```

Navigate to https://localhost:5006 in your browser and you will see Actual.

You should deploy the server somewhere so you can access your data from anywhere. See instructions on the [actual-server](https://github.com/actualbudget/actual-server) repo.

### Without a server

This will give you a fully local web app without a server. This npm package is the `packages/desktop-client` package in this repo built for production:

```
yarn add @actual-app/web
```

Now you need to serve the files in `node_modules/@actual-app/web/build`. One way to do it:

```
cd node_modules/@actual-app/web/build
npx http-server .
```

Navigate to http://localhost:8080 and you should see Actual.

## Building

If you want to build the latest version, see [releasing.md](https://github.com/actualbudget/actual/blob/master/docs/releasing.md). It provides instructions for building this code into the same artifacts that come from npm.

## Run locally

Both the electron and web app can started with a single command. When running in development, it will store data in a `data` directory in the root of the `actual` directory.

First, make sure to run `yarn install` to install all dependencies.

In the root of the project:

```
yarn start            # Run the electron app
yarn start:browser    # Run the web app
```

## Code structure

The app is split up into a few packages:

* loot-core - The core application that runs on any platform
* loot-design - The generic design components that make up the UI
* desktop-client - The desktop UI
* desktop-electron - The desktop app
* mobile - The mobile app

More docs are available in the [docs](https://github.com/actualbudget/actual/tree/master/docs) folder.
