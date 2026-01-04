# GoCardless Setup

:::note
Client Version 23.7.0 and
Server Version 23.7.0 or higher are required for this feature.
:::

:::warning
From July 2025 onwards, GoCardless has stopped accepting new Bank Account Data accounts. The below sign up instructions are now outdated, however, if you are an existing user, your account should continue to work.
:::

### Create SECRET and KEY for Actual

1. Create an account with GoCardless - https://bankaccountdata.gocardless.com/overview/.
2. Log into your account dashboard at the same URL and select **Developers->User secrets** from the left side menu.

   ![Screenshot of GoCardless developer portal](/img/connecting-your-bank/connecting-your-bank-gocardless-01.webp)

3. Click on the '+ create new' button at the bottom left.
   - Make sure you download your secrets file since the **key** will not be available to you again in the account dashboard
   - These secrets will be used in Actual to make the bank sync connection

   ![Screenshot of GoCardless page for creating API secrets](/img/connecting-your-bank/connecting-your-bank-gocardless-02.webp)

4. Enter a name for your secrets and click Create.
   _This is only for you to easily identify them in the GoCardless User secrets overview_

   ![Screenshot of GoCardless form for creating new API secret](/img/connecting-your-bank/connecting-your-bank-gocardless-03.webp)

5. Download this file and keep it on your computer.

   ![Screenshot of GoCardless API secret after successful creation](/img/connecting-your-bank/connecting-your-bank-gocardless-04.webp)

6. Back in Actual, click on "+ Add account" at the bottom of the sidebar.

   ![Actual sidebar with accounts](/img/connecting-your-bank/connecting-your-bank-02.webp)

7. Click "Set-up GoCardless for bank-sync."

   ![Add account dialog](/img/connecting-your-bank/connecting-your-bank-gocardless-05.webp)

8. You will be asked to enter your GoCardless secret ID and secret key. These values will be saved on the server, so you will only need to enter them once.

   ![Set-up GoCardless dialoag](/img/connecting-your-bank/connecting-your-bank-gocardless-06.webp)

### Link Accounts with GoCardless

1. Add the link to your accounts in actual (Existing or New).
   - **_For an existing account, click on that account, select the ... (kebab menu) in the top right, and choose Link Account_**

     ![Linking an existing account to GoCardless](/img/connecting-your-bank/connecting-your-bank-01.webp)

   - **_To create a new account with bank syncing click on the '+ Add account' link in the left menu at the bottom_**

     ![Actual sidebar with accounts](/img/connecting-your-bank/connecting-your-bank-02.webp)

2. Select the Link your bank account button.

   ![Add account dialog](/img/connecting-your-bank/connecting-your-bank-03.webp)

3. Select your country and bank from the list and click the Link bank in browser button.

   ![Link your bank dialog](/img/connecting-your-bank/connecting-your-bank-04.webp)

4. Clicking Link bank in browser will redirect you to a new tab to grant access to your bank for GoCardless.

   ![Link you bank feedback](/img/connecting-your-bank/connecting-your-bank-05.webp)

5. Select **I agree** to continue with setting up the connection.

   ![Dialog to approve that GoCardless will be accessing your payment account information](/img/connecting-your-bank/connecting-your-bank-gocardless-07.webp)

6. If your connection was a success, you will be able to click on the continue button which allows GoCardless to connect.

   ![Feedback for successful linking to your bank](/img/connecting-your-bank/connecting-your-bank-07.webp)

7. A progress indicator will display while GoCardless connects to your bank to get a list of your accounts.

   ![Dialog saying please wait while we finish linking your account(s).](/img/connecting-your-bank/connecting-your-bank-08.webp)

8. Once the connection has been made, there will be a list of your accounts that you can choose from.

   ![Select bank account you want to link](/img/connecting-your-bank/connecting-your-bank-09.webp)

9. The final step is to select the account you want to sync and click Link account.

   ![Dialog for linking accounts you want to sync](/img/connecting-your-bank/connecting-your-bank-10.webp)

### Frequently Asked Questions

**Does Actual sync automatically with your Bank?**

At this moment, it is not yet possible for Actual to automatically sync with your bank. You need to do this manually by going to "All Accounts" and pressing "Sync".

![Image showing where in the GUI you can sync your bank accounts](/img/connecting-your-bank/syncing-with-your-bank.webp)

**The best way to start from scratch in Actual with GoCardless?**

If you are setting up Actual for the first time, it is much easier not to try to pull in historic data. This has caused some users a lot of headaches with subsequent reconciliation. The following process may be more helpful:

1. Set up your account in Actual specifying a correct opening account balance at a recent date.
2. Link the account to GoCardless as above
3. Sync the account with GoCardless. You should find that only transactions subsequent to the opening account balance entry are imported, making reconciliation easy.

**How many times can I sync with GoCardless?**

In the free tier, you can connect up to 50 banks per month. If one of your banks include more than one account inside (like credit and debit cards), it will still be counted as one connection.
Every day you can sync each bank up to 4 times and there is no monthly limit though, just the daily one.
For more information, see the [Bank Account Data API Usage](https://bankaccountdata.zendesk.com/hc/en-gb/articles/11528933493916-Bank-Account-Data-API-Usage-how-is-your-usage-number-calculated)
topic in the GoCardless FAQ.
