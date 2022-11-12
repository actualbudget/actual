---
title: 'Overview'
---

Installing Actual be it on your own personal computer or in the cloud is really simple, we have a selection of guides available that will help you get setup, but first, there are some things your going to need and also some things we need to tell you that we currently don't support.

There are two basic methods of installing Actual.  The first is to build from source.  If you plan to build from source, package your own Docker images, or use Fly.io as your hosting provider there are a few pre-requisites to get started. 

If you would simply like to use the Docker images provided by the Actual development team, you only need to install Docker to run it locally.  If you plan to use a hosting provider in the cloud like PikaPods, you may not have to install anything.

Pick one of our guides which should help you install Actual and identify the specific pre-requisites for an environment that is suitable for you.

### Pre-requisites from source code or Fly.io

We support all Operating systems including Windows, OSX or Linux.

Install [Git](https://git-scm.com/) for your operating system,

Install [NodeJS](https://nodejs.org/en/) version 14 or greater (version 19 is currently not supported),

You will need access to the internet.

Install [Yarn](https://yarnpkg.com/) using NPM, if you only just installed NodeJS you may need to restart your terminal.

```js
npm install --global yarn
```

