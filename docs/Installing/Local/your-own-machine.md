---
title: 'Local Installation'
---

The easiest way to get Actual running is to use the [actual-server](https://github.com/actualbudget/actual-server) project. 

Actual Server is the server element of Actual that is used for syncing changes across devices, and it comes with the latest version of Actual Web.

## Getting Started 

As outlined in the [overview](/installing/overview.md) you need to make sure the following is installed on your machine before starting. 

[NodeJS](https://nodejs.org/en/) version 14 or greater, NodeJS has documentation on how to install it on your own machine, [Yarn](https://yarnpkg.com/) you can install this using NPM, however if you only just installed NodeJS you may need to restart your terminal first before running the below command.

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

Now that Actual is *installed* we can start it by issuing the following command

```bash
yarn start
```

## Accessing Actual

You should now be able to access [https://localhost:5006](https://localhost:5006) in your browser and you will see Actual.