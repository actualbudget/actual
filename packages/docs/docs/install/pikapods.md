---
title: 'PikaPods'
---

[PikaPods](https://www.pikapods.com/) offers one click "instant open source app hosting", allowing you to run Actual for about $ 1.50 per month (as of November 2025).

Using PikaPods is also a simple way to support the development of Actual Budget, as PikaPods will share some of its revenues with Actual for customers using their Actual Budget Pods.

You get a $ 5.00 credit when you sign up, which means that you should be able to run Actual for 3 months before your credit runs out.

For web clients, PikaPods will automatically update about a week or so after the latest monthly release is deployed. PikaPods tests each new release before deploying it. If you have the Notification setting in PikaPods checked, you will get an email notifying you that the server has been updated.

For desktop clients, you will need to reinstall the desktop client to update to the latest version.
First check on the web client to see if PikaPods has updated, then reinstall the desktop client.

:::note[Using Actual on Pikapods]

We suggest [using a PWA](#using-a-PWA) desktop client with PikaPods so you don't run into version issues.

:::

## Deploying Actual on PikaPods

If you are technically inclined, just [Click here to create an account and run Actual on PikaPods](https://www.pikapods.com/pods?run=actual).

You can leave the resources at their lowest setting (although you will need a non-zero amount of storage for your budget files).

_Your browser does most of Actual's computation,_ so purchasing more resources for the server won't necessarily result in a better experience.

After setting up your Pod, head over to our [Starting Fresh](/docs/getting-started/starting-fresh) guide to get started with
Actual Budget.

## A step by step guide to setting up Actual Budget with PikaPods

[Click here to go to PikaPods setup for Actual](https://www.pikapods.com/pods?run=actual).

You will be greeted with the following screen.

![image PikaPods register](/img/pikapods-setup/pikapods-1-register-login.webp)

Click on the **register** link inside the blue banner, which will take you to the user registration screen.

## The user registration screen

A working email address is required, as PikaPods will send an email with a link you need to click on to complete the signup process.

![Image Pikapods email](/img/pikapods-setup/pikapods-2-register-name.webp)

## Verification email

Click the green button **Activate and Login**. You are now registered as a PikaPods customer. You will be returned to the login screen.

![Image Pikapods email registration](/img/pikapods-setup/pikapods-4-email-activation.webp)

## Login screen

Enter _your_ registration email address and password.

![Image Pikapods login](/img/pikapods-setup/pikapods-5-login-screen.webp)

## Naming your Pod

Simply put, _a Pod is a very tiny computer running in the cloud_. Typically, a Pod only runs one application - like Actual Budget Server.

:::info

Multiple budgets can reside in one Pod running Actual. You do not need to set up a new Pod for each budget you create. The number of budgets is limited only by the storage capacity you assign to your Pod.

If you [connect to your bank](/docs/advanced/bank-sync.md), note that all budgets in the same Pod share a single bank sync key.

:::

In 1), you enter a name for your Pod. This name really does not matter unless you plan to run several different Pods.

In 2), you decide which region your Pod should run - choose the most suitable region.

![Image pikapods basic](/img/pikapods-setup/pikapods-6-add-pod-basics.webp)

## Assigning storage to your Pod

The minimum storage you can assign to your Pod is 10 GB (gigabytes). We promise you that this is more than enough for your budget purposes.

Example: It takes about 33 megabytes of storage for about 1,200 transactions, 18 months of budgeting, and approximately 200 rules and payees. 10 gigabytes equals 10,000 megabytes, equivalent to 303 18-month budgets.

Your Pod will be created when you click on the green **ADD POD** button. This step takes less than one minute.

![Image pikapods add resources](/img/pikapods-setup/pikapods-7-add-pod-resoruces.webp)

## Your Pod is now ready to be used

Click on the green **OPEN POD** button to be taken to your Pod.

The address for your Actual Budget is found in the Domain field. In the screenshot example, this is `https://berserk-bullmastiff.pikapod.net/budget/`. Yours will be something completely different.

![Image pikapod pod url](/img/pikapods-setup/pikapods-8-running-pod.webp)

## Setting a password for your Actual Budget

Before you can start using Actual, you need to set a password for your server. This password is used the next time you log into your server - and should never be the same as your PikaPods account password.

:::warning

Keep your Actual Budget password safe, as it cannot be retrieved. If you forget your server password, you will not be able to retrieve your budget.

:::

![Image connecting to Actual](/img/a-tour-of-actual/server-connecting-first-time.webp)
<br />
<br />

## Using a PWA (Progressive Web App) {#using-a-PWA}

When using Actual Server over the internet, we suggest using a PWA web client. After you login and open Actual Budget, it's easy to set up a PWA from your browser of choice.

Here's some help with a few common desktop browsers.

:::note

Browser version and OS/browser combination may affect how to install a PWA. Please refer to your browsers documentation for definitive guidance.

:::

- Chrome: There may be an "app available" icon on the right side of the URL or use the browser menu. See [Chrome's documentation](https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DDesktop).

- Firefox: In supported OS, there should be an "add tab to taskbar" icon on the right side of the URL. You may need to add a PWA extension as described in [Mozilla's documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing).

- Safari: There should be a share icon in the Safari toolbar or use the browser menu. See [Safari's documentation](https://support.apple.com/en-mide/104996).

For other browsers or browser/OS combinations, most search engines or the browser's documentation will describe how to install a PWA. PC Magazine had an [article in March 2025](https://www.pcmag.com/explainers/how-to-use-progessive-web-apps) with some good information.

## Getting started with Actual Budget

Go to our [Starting Fresh](/docs/getting-started/starting-fresh) guide to get started with Actual Budget.
