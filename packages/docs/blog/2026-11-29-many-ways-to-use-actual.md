---
title: The Many Ways to Use Actual
description: Actual is not just one app. You can run it on a server, install it on your phone, download it to your computer, script it from the terminal, or build something new on top of it. Here is a tour of all the options.
date: 2026-11-29T10:00
slug: many-ways-to-use-actual
tags: [announcement]
hide_table_of_contents: false
authors: MatissJanis
---

Most people know Actual as the app they open in a browser tab. But that is only one way to use it. Over the years Actual has grown into a whole set of tools, and many folks do not know half of them exist. So here is a tour of all the ways you can use Actual today.

<!--truncate-->

## Run It on a Server

This is the classic setup. You run a small server, open Actual in your browser, and your budget syncs between all your devices. The server is also what unlocks bank sync.

Running a server sounds scary, but it does not have to be. Pick whatever matches your comfort level:

- **[PikaPods](../../docs/install/pikapods)** if you do not want to touch a terminal. A few clicks and a small monthly fee.
- **[Docker](../../docs/install/docker)** if you already self-host other things.
- **[Server CLI](../../docs/install/cli-tool)** if you just want one command that starts the server.
- **[Fly.io](../../docs/install/fly)** if you want it in the cloud.

The community has also written guides for Synology, Home Assistant, Proxmox and many more. You can find them in the [installation guide](../../docs/install/).

## Install It on Your Home Screen

Once you have a server, you can install Actual on your phone or tablet. Open your server in the browser, choose **Add to Home Screen** (or **Install** on Android), and that's it. Actual now has its own icon, opens in full screen, and works offline.

No app store needed. This is how most people use Actual on mobile today.

## Download the Desktop App

Don't want to run a server at all? Download the desktop app. Everything is bundled in, so you can start budgeting right away. And if you set up a server later, the desktop app can connect to it.

- **Windows:** get it from the [Microsoft Store](https://apps.microsoft.com/detail/9p2hmlhsdbrm?cid=actualbudget.org&mode=direct) or as a direct download.
- **Linux:** get it from [Flathub](https://flathub.org/en/apps/com.actualbudget.actual) or as an AppImage.
- **macOS:** available as a direct download for both Intel and Apple Silicon.

All the links are on our [downloads page](../../download).

## Try the iOS App

We are building an official iOS app. It is in beta right now, so it is only available through TestFlight. You can [join the beta here](https://testflight.apple.com/join/Sk6BEyBQ).

To be clear: this is a beta. Testers get a fresh build every night, so expect a rough edge here and there. If you find one, please tell us in the [TestFlight feedback issue](https://github.com/actualbudget/actual/issues/9440).

## Coming Soon

We are not done yet. These are on the way:

- **Mac app** in the Mac App Store
- **iOS app** in the App Store
- **Android app**

We will announce each of them here once they are ready.

## Use It from the Terminal

Actual also has a [command-line tool](../../docs/api/cli). It lets you check balances, add transactions, set budget amounts and run queries without ever opening the app.

```bash
npm install --location=global @actual-app/cli
```

This is great for scripts and scheduled jobs. But where it really shines is with AI agents. An agent can not click around in an app, but it is very good at running commands. Give it the CLI and you can ask things like "how much did I spend on groceries last month?" and get a real answer from your real budget.

## Extend It with the API

If you are a developer, the [`@actual-app/api`](../../docs/api/) package gives you full access to your budget from code. People use it to import transactions from banks we do not support, export data to spreadsheets, and automate the boring parts of budgeting.

One thing to keep in mind: this is not an HTTP API. It is a package you install and run yourself, and it works on a local copy of your budget.

## Build Your Own App

The API package also runs in the browser. That means you can build a completely new app on top of your Actual data, with no backend of your own.

We built a small [demo app](https://api-demo.actualbudget.org) to show how this works. It loads your budget and turns it into an analysis dashboard, with all of the analysis running locally in your browser. The [source code](https://github.com/actualbudget/browser-app-demo) is open, so feel free to use it as a starting point for your own idea.

## Make It Look Like Yours

Not a fan of the default colors? Go to **Settings** → **Themes** → **Custom theme** and pick one from the catalog. Every theme in there was made by someone in the community.

And if none of them fit, [build your own](../../docs/custom-themes). A theme is just a list of colors, so you do not need to be a developer to make one. The [demo theme](https://github.com/actualbudget/demo-theme) is a good place to start.

## Explore the Community Projects

This might be my favorite part. People in the community have built an incredible number of tools around Actual:

- Bank importers for banks all over the world
- Connectors that let AI assistants talk to your budget
- Native mobile apps and home screen widgets
- Home Assistant integrations
- Backup tools, helper scripts, and much more

We keep a list of them on the [community projects](../../docs/community-repos) page. These are not maintained by us, but they are open source, so anyone can read the code and judge it on its own merits.

## Pick What Works for You

There is no "right" way to use Actual. Some people only ever use the desktop app. Others run a server, script half their budget, and build their own dashboards on top. Both are perfectly fine.

If you have built something on top of Actual, come share it in our [Discord](https://discord.gg/pRYNYr4W5A). We love seeing what people come up with.
