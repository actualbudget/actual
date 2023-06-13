# Local Installation

The easiest way to get Actual running locally is to use the [actual-server](https://github.com/actualbudget/actual-server) project.

Actual Server is the server element of Actual that is used for syncing changes across devices, and it comes with the latest version of Actual Web.

## Pre-requisites

Actual Server currently requires at least Node.js v16. If you don’t have Node.js installed, you can download the latest version of Node.js from the [Node.js website](https://nodejs.org/en/download) (we recommend downloading the “LTS” version). If you already have Node.js installed, you can use it directly if it’s version 16 or newer. Consider using a tool like [`nvm`](https://github.com/nvm-sh/nvm) or [`asdf`](https://asdf-vm.com) to install and manage multiple versions of Node.js.

You’ll also need to have Git installed. The Git website has [instructions for all supported operating systems](https://git-scm.com/download).

Next, you’ll need to install `yarn`, which is the package manager that Actual uses. You can install it using the following command:

```js
npm install --global yarn
```

## Installing Actual

First you need to clone the Actual Server project to your machine, you can do this using Git.

```bash
git clone https://github.com/actualbudget/actual-server.git
```

Once you have it cloned, navigate to the directory where you cloned the project

```bash
cd actual-server
```

Install all the dependencies using `yarn`

```bash
yarn install
```

## Running Actual

Now that Actual is installed, start the server by running the following command:

```bash
yarn start
```

Note that if you restart your computer, you’ll have to run this command again to start the server.

## Accessing Actual

You should now be able to visit Actual by going to [http://localhost:5006](http://localhost:5006) in your browser.

When first accessing Actual, you may be prompted to provide a URL for the server. For a local installation like this, you can click the “Use localhost:5006” button to use the same URL as the one you’re accessing Actual from.

## Updating Actual

When we publish a new release, you’ll need to follow these steps to update:

1. Stop the server if it’s running. You can use the keyboard shortcut <Key mod="ctrl" k="c" /> (even on macOS) to stop the server, or close the terminal window it’s running from.
2. Run `git pull` from the directory you cloned the project into. This will download the latest server code.
3. Run `yarn install` from that same directory. This will download the latest web client code, along with any updated dependencies for the server.
4. Restart the server by running `yarn start`.
