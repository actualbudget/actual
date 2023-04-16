---
Title: 'Conn Bank'
---

# Connecting Your Bank

:::warning
This is an **experimental feature**. That means we’re still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in the Discord.
:::

:::note
Client Version 23.3.0 and
Server Version 23.3.1 or higher are required for this feature.
:::

We are excited to offer this optional bank integration in Actual. Here are a couple of considerations to know about before making the decision to use bank sync in your installation of Actual Budget.

- This integration relies on you providing your own API credentials that you will need to get by signing up with the service provider and Generate Keys and Secrets that will be used in Actual.

- The integration only works if you are using actual-server

- The Secrets and Keys are stored in your Actual installed version so it is highly recommended to turn on End to End encryption and create a strong passphrase to encrypt your files.

- Bank Sync is part of the Experimental Features in settings and needs to be turned on in order to use this integration

- You will need to add a config file to your installation

### Supported Providers

Nordigen

### Nordigen Setup

**Create SECRET and KEY for Actual**

1. Create an account with Nordigen - https://nordigen.com/
2. Log into your account dashboard page and select **User secrets** from the left side menu - https://ob.nordigen.com/user-secrets/

![](/static/img/connecting-your-bank/connecting-your-bank-nordigen-01.png)

3. Click on the '+ create new' button at the bottom left or click the 'Create new Secrets' button the top right
   - Make sure you download your secrets file since the **key** will not be available to you again in the account dashboard
   - These secrets will be used in Actual to make the bank sync connection

![](/static/img/connecting-your-bank/connecting-your-bank-nordigen-02.png)

4. Enter a name for your secrets and click Create.
   _This is only for you to easily identify them in the Nordigen User secrets overview_

![](/static/img/connecting-your-bank/connecting-your-bank-nordigen-03.png)

5. Download this file and keep it on your computer.

![](/static/img/connecting-your-bank/connecting-your-bank-nordigen-04.png)

### Setup Config files in Actual

_You need to setup env variables or a config.js file before Actual can use the Nordigen integration._

Follow the steps provided in the [Configuring the server section](https://actualbudget.github.io/docs/Installing/Configuration)

### Link Accounts with Nordigen

1. Add the link to your accounts in actual (Existing or New)

   - **_For an existing account, click on that account, select the ... (kebab menu) in the top right, and choose Link Account_**

   ![](/static/img/connecting-your-bank/connecting-your-bank-01.png)

   - **_To create a new account with bank syncing click on the '+ Add account' link in the left menu at the bottom_**

   ![](/static/img/connecting-your-bank/connecting-your-bank-02.png)

2. Select the Link your bank account button

![](/static/img/connecting-your-bank/connecting-your-bank-03.png)

3. Select your country and bank from the list and click the Link bank in browser button

![](/static/img/connecting-your-bank/connecting-your-bank-04.png)

4. Clicking Link bank in browser will redirect you to a new tab to grant access to your bank for Nordigen

![](/static/img/connecting-your-bank/connecting-your-bank-05.png)

5. Select **I agree** to continue with setting up the connection

![](/static/img/connecting-your-bank/connecting-your-bank-06.png)

6. If your connection was a success, you will be able to click on the continue button which allows Nordigen to connect

![](/static/img/connecting-your-bank/connecting-your-bank-07.png)

7. A progress indicator will display while Nordigen connects to your bank to get a list of your accounts

![](/static/img/connecting-your-bank/connecting-your-bank-08.png)

8. Once the connection has been made, there will be a list of your accounts that you can choose from

![](/static/img/connecting-your-bank/connecting-your-bank-09.png)

7. The final step is to select the account you want to sync and click Link account

![](/static/img/connecting-your-bank/connecting-your-bank-10.png)

### Frequently Asked Questions

**Automatic Bank Sync**

At this moment, it is not yet possible for Actual to automatically sync with your bank. You need to do this manually by going to "All Acounts" and pressing "Sync".

![](/static/img/connecting-your-bank/syncing-with-your-bank.png)
