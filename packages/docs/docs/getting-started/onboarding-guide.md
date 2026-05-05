---
title: Step-by-step onboarding guide
---

# Step-by-step onboarding guide

## Who is this guide for?

This guide is for new users who want a practical first path through Actual. It is not a replacement for the installation guides or the Starting Fresh guide. Instead, it helps you choose the setup option that best fits your needs and provides a simple order to follow after Actual starts.

By the end of this guide, you should know which setup path to choose, how to start your first budget file, and which features to explore first.

## Choose how you want to use Actual

Actual can be used in a few different ways. Choose the option that best matches your goal:

- **I want to try Actual without installing anything**: Use the [demo](https://demo.actualbudget.org) if you want to explore the interface before setting anything up.
- **I want to use Actual on one computer**: Use the [desktop app](/docs/install/desktop-app) if you only need Actual on one device.
- **I want to use Actual on multiple devices or share a budget**: Use [PikaPods](/docs/install/pikapods) or a [self-hosted server](/docs/install/docker) if you want syncing across devices.
- **I want to contribute to Actual**: Use the [build from source](/docs/install/build-from-source) or development setup documentation if you want to edit the code or documentation.

If you are unsure, start with the demo or desktop app. You can move to a server-based setup later if you decide you want syncing across devices.

:::tip
Steps one and two do not apply to demo or desktop users.
:::

## Step One: Set a server password

Set a password for Actual. This password will be used every time you launch the application. So make sure it is both secure and memorable.

:::tip
Use a password manager to generate and store a secure password for you.
:::

## Step Two: Log in

Log in with the same password you just created. This should take you to your Actual home dashboard.

## Step Three: Add an account

Click the add account button. This will give you several options:

1. **Create local account**

   Create a local account if you want to add transactions manually. You can also import QIF/OFX/QFX files into a local account.

2. **Set up GoCardless for bank sync**

   Link a European bank account to automatically download transactions. GoCardless provides reliable, up-to-date information from hundreds of banks.

3. **Set up SimpleFIN for bank sync**

   Link a North American bank account to automatically download transactions. SimpleFIN provides reliable, up-to-date information from hundreds of banks.

4. **Set up Pluggy.ai for bank sync**

   Link a Brazilian bank account to automatically download transactions. Pluggy.ai provides reliable, up-to-date information from hundreds of banks.

## Step Four: Create local account _(if you chose the local account option above)_

One of the great things about Actual is that you do not need to connect your bank account if you do not want to. When you press this option, a screen will pop up that lets you manually enter the amount in the account.

When creating a local account:

- Enter the account name you would like to add.
- Enter the current balance of the account.
- Check **Off budget** option only if you want this account to be tracked without affecting your budget.

## Step Five: Review available funds

After adding an account, you should see a budget tab in the left sidebar. Clicking that will let you see your available funds and funds that can be assigned to budget categories.

## Step Six: Assign money for each category

From here, you can start adding your budget for each category. Keep in mind, it does not need to be perfect at first! As time goes on, you will start to see trends and ways to more optimally shift the budget.

## What to read next

After completing these steps, continue with the [Starting Fresh](/docs/getting-started/starting-fresh) guide for a deeper walkthrough of building your first budget.

If you already know which setup option you want, use the installation guide that matches your path:

- [Desktop app](/docs/install/desktop-app)
- [PikaPods](/docs/install/pikapods)
- [Docker](/docs/install/docker)
- [Build from source](/docs/install/build-from-source)
