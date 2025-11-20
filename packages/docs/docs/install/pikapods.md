---
title: 'PikaPods'
---


[PikaPods](https://www.pikapods.com/) offers one click "instant open source app hosting", allowing
you to run Actual for about $ 1.50 per month (as of November 2025).

Using PikaPods is also a simple way to support the development of Actual Budget, as PikaPods will
share some of its revenues with Actual for customers using their Actual Budget pods.

You get a $ 5.00 credit when you sign up, which means that you should be able to run Actual for 3 months before your credit runs out.

For web clients, PikaPods will automatically update about a week or so after the latest monthly release is deployed. PikaPods tests each new release before deploying it. If you have the Notification setting in Actual checked, you will get a popup in Actual notifying you that the server has been updated.

For desktop clients, you will need to reinstall the desktop client to update to the latest version.
We suggest first checking on the web client if PikaPods has updated, then reinstalling the desktop client.

:::note[Using Actual on Pikapods]

We suggest [using a PWA](#using-a-pwa) desktop client with Pikapods so you don't run into version issues.

:::

## Deploying Actual on PikaPods

If you are technically inclined, just [Click here to create an account and run Actual on PikaPods](https://www.pikapods.com/pods?run=actual).

You can leave the resources at their lowest setting (although you will need a non-zero amount of storage for your budget files).

_Actual does almost all of its computation in your browser, so purchasing more resources for the server won’t necessarily result in a better experience_

After you have set up your Pod, head over to our  [Starting Fresh](/docs/getting-started/starting-fresh) guide to get started with
Actual Budget.

## A step by step guide to setting up Actual Budget with PikaPods

[Click here to go to PikaPods setup for Actual](https://www.pikapods.com/pods?run=actual).


You will be greeted with the following screen.

![image pikapods register](/img/pikapods-setup/pikapods-1-register-login.png)

Click on the **register** link inside the blue banner, which will take you to the user registration screen.


## The user registration screen

This screen is self-explanatory, but a kind reminder is to use a password only you know.
You will need to use a working email address, as you will receive an email with a link you need
to click on to complete the signup process.

![Image pikapods email](/img/pikapods-setup/pikapods-2-register-name.png)


## Verification email

By clicking the green button saying **Activate and Login**, you are now registered as
a PikaPods customer. You will be returned to the login screen.

![Image pikapods email registration](/img/pikapods-setup/pikapods-4-email-activation.png)


## Login screen

Enter the email address and password you registered yourself with.

![Image pikapods login](/img/pikapods-setup/pikapods-5-login-screen.png)


## Naming your Pod

A simplistic explanation of a Pod in layperson's terms is that *a Pod is a very tiny computer running in the cloud*.
Typically, a Pod only runs one application - like Actual Budget.

In 1), you enter a name for your Pod. This name really does not matter unless you plan to run several different Pods.
In 2), you decide which region your Pod should run - choose the most suitable region.

:::info

One Pod running Actual can have multiple budgets available at the same time. You do not need to set up a new Pod
for each budget you want to set up. The number of budgets is only limited by the storage capacity you assign to your
Pod.

:::


![Image pikapods basic](/img/pikapods-setup/pikapods-6-add-pod-basics.png)


## Assigning storage to your Pod


The minimum storage you can assign to your Pod is 10 GB (gigabytes). We promise you
that this is more than enough for your budget purposes.

Example: With around 1,200 transactions, 18 months of budgeting, and approximately 200 rules and payees,
it takes around 33 megabytes of storage. 10 gigabytes equals 10,000 megabytes, equivalent to 303 18-month budgets.

Your Pod will be created when you click on the green **ADD POD* button. This step takes less than one minute.

![Image pikapods add resources](/img/pikapods-setup/pikapods-7-add-pod-resoruces.png)



## Your pod is now ready to be used

When you click on the green **OPEN POD** button you will be taken to your Pod.

The address for your Actual Budget is found in the Domain field. In the screenshot example, this is
`https://berserk-bullmastiff.pikapod.net/budget/`. Yours will be something completely different.


![Image pikapod pod url](/img/pikapods-setup/pikapods-8-running-pod.png)


## Setting a password for your Actual Budget

Before you can start using Actual, you need to set a password for your server. This password is used
next time you log into your server - and should never be the same as your PikaPods account password.

Keep this password safe, as it cannot be retrieved. If you forget your server password, you will not
be able to retrieve your budget.


![Image connecting to Actual](/img/a-tour-of-actual/server-connecting-first-time.png)

## Using a PWA (Progressive Web App) {#using-a-pwa}

When using Actual Server, we suggest using a PWA web client. It's easy to set up a PWA from your browser of choice after you have logged in and have opened Actual Budget.

Here's some help with a few common desktop browsers.

:::warning

Browser version and OS combination may affect how to install a PWA. Please refer to your browsers documentation for definitive guidance.

:::

Chrome: There may be an "app available" icon on the right side of the URL or use the browser menu. See [Chrome's documentation](https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DDesktop).

Firefox: In supported OS, there should be an "add tab to Taskbar" icon on the right side of the URL. You may need to add a PWA extension as described in [Mozilla's documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing).

Safari: There should be a share icon in the Safari toolbar or use the browser menu. See [Safari's documentation](https://support.apple.com/en-mide/104996).

For other browsers or browser/OS combinations, most search engines or the browser's documentation will describe how to install a PWA. PC MAgazine had an [article in March 2025](https://www.pcmag.com/explainers/how-to-use-progessive-web-apps) with some good information.
<br />
<br />

## Getting started with using Actual Budget

Go to our [Starting Fresh](/docs/getting-started/starting-fresh) guide to get started with
Actual Budget.

