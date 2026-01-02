# SimpleFIN Setup

:::note
Client Version 24.10.0 and
Server Version 24.10.0 or higher are required for this feature.
:::

### Generate Setup Token for Actual

1. Create an account with SimpleFIN Bridge - https://beta-bridge.simplefin.org/ , by clicking "Get Started" and entering your email address.

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-01.webp)

2. You will receive an email with the login link, after a few minutes. Click this link to log into your account dashboard.

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-02.webp)

3. Accept the terms, on first login, and then you will be taken to "My Account".

4. Link any banks that you wish.
   - You will need to add your accounts first, through "Financial Institutions" > New Connection
   - You will need to subscribe before your first can be added. Current rates are $1.50 / mo, or $15 / year.

5. From the "My Accounts" page, under "Apps", click on "New Connection". Give your connection a name, and click "Create Setup Token"

   _This is only for you to easily identify it in the SimpleFIN connections overview._

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-03.webp)

6. Save the generated Setup Token someplace safe (one-time use only).

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-04.webp)

7. Back in Actual, click on "+ Add account" at the bottom of the sidebar.

   ![](/img/connecting-your-bank/connecting-your-bank-02.webp)

8. Click "Link bank account with SimpleFIN".

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-05.webp)

9. You will be asked to enter your SimpleFIN setup token. The keys from this value will be saved on the server, so you will only need to enter it once.

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-06.webp)

### Link Accounts with SimpleFIN

1. Add the link to your accounts in actual (Existing or New).
   - **_For an existing account, click on that account, select the ... (kebab menu) in the top right, and choose Link Account_**

     ![](/img/connecting-your-bank/connecting-your-bank-01.webp)

   - **_To create a new account with bank syncing click on the '+ Add account' link in the left menu at the bottom_**

     ![](/img/connecting-your-bank/connecting-your-bank-02.webp)

2. Select the Link bank account with SimpleFIN button.

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-07.webp)

3. A Link Accounts box will pop up. To link a SimpleFIN account to an Actual account, click the "Setup bank-sync" button in the same row.
   - The "Bank Account To Sync" column contains the names of the accounts found via SimpleFIN
   - The "Account in Actual" column contains the name of the Actual account it is linked to.
   - You can also click in the "Account in Actual" column, instead of clicking the "Setup bank-sync" button.

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-08.webp)

4. Either select an existing Actual account to link to, or create a new one.

   ![](/img/connecting-your-bank/connecting-your-bank-simplefin-09.webp)

5. When you've mapped all your accounts that you wish to, click the "Link Account" button.

### SimpleFIN Considerations

1. Currently, the sync pulls at most 90 days of data from each linked account. The amount of data SimpleFIN can get from each account may vary, so not all accounts may have 90 days of historical transactions that can be imported.

2. SimpleFIN's data updates one time / day, roughly every 24 hours, for each linked account. The time of day that each bank updates in SimpleFIN may vary, even from day to day (based on the bank and upstream provider, MX).

### Resetting the Setup Token

To reset your SimpleFIN setup token:

1. Click "Add Account" in the sidebar.

2. Next to "Link bank account with SimpleFIN", click the three-dot menu button.

3. Click "Reset SimpleFIN credentials".

You will then need to obtain a new setup token from SimpleFIN and enter it into Actual.
