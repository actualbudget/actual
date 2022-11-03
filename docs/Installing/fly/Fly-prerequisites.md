---
title: 'Fly Pre-requisites'
---

## Pre-requisites

There are some things we need to do before we get started though.

:::note
If deploying via Terminal on a Mac be sure that you have granted Terminal `Full Disk Access` rights
:::

### Fly.io Account

Create an account with [fly.io](https://fly.io/app/sign-up). Although you are required to enter
payment details, everything we do here will work on the free tier and you won't be charged.

### Flyctl tool installation

1. Open up PowerShell on your local machine and paste the following command into the window:
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```
   ![](/img/fly-install-1.png)
1. Flyctl should start installing

   ![](/img/fly-install-2.png)
1. Once done you should get a message saying `Run flyctl --help to get started`:
   ![](/img/fly-install-3.png)

Flyctl is now installed.