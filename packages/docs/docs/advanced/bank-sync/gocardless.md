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

   <img width="240" alt="The sidebar with the Add account button at the bottom highlighted" src="/img/advanced/bank-sync/bank-sync-add-account@2x.webp" />

7. Click **Set up bank sync**. This opens the **Bank Sync** page in Settings.

   <img width="518" alt="The Add account dialog with the Set up bank sync button highlighted" src="/img/advanced/bank-sync/bank-sync-add-account-modal@2x.webp" />

8. Under **Providers**, click **Set up** on the GoCardless card.

   <img width="640" alt="The Providers section of the Bank Sync page with Set up on the GoCardless card highlighted" src="/img/advanced/bank-sync/gocardless-set-up@2x.webp" />

9. You will be asked to enter your GoCardless secret ID and secret key. These values will be saved on the server, so you will only need to enter them once.

   <img width="510" alt="The Set up GoCardless dialog with empty Secret ID and Secret Key fields" src="/img/advanced/bank-sync/gocardless-setup-modal@2x.webp" />

### Link Accounts with GoCardless

1. Add the link to your accounts in actual (Existing or New).
   - **_For an existing account, click on that account, select the ... (kebab menu) in the top right, and choose Link account_**

     <img width="297" alt="The account menu with Link account highlighted" src="/img/advanced/bank-sync/bank-sync-link-account-menu@2x.webp" />

   - **_To create a new account with bank syncing click on the '+ Add account' link in the left menu at the bottom, then click Set up bank sync_**

     <img width="240" alt="The sidebar with the Add account button at the bottom highlighted" src="/img/advanced/bank-sync/bank-sync-add-account@2x.webp" />

2. Click the **Link bank account** button on the GoCardless card.

   <img width="662" alt="The Link account dialog with Link bank account on the GoCardless card highlighted" src="/img/advanced/bank-sync/gocardless-link-bank-account@2x.webp" />

3. Select your country and bank from the list and click the Link bank in browser button.

   <img width="510" alt="The Link Your Bank dialog with a country and a bank chosen and the Link bank in browser button" src="/img/advanced/bank-sync/gocardless-link-your-bank@2x.webp" />

4. Clicking Link bank in browser will redirect you to a new tab to grant access to your bank for GoCardless.

   <img width="510" alt="The Link Your Bank dialog saying Waiting on GoCardless" src="/img/advanced/bank-sync/gocardless-waiting@2x.webp" />

5. Select **I agree** to continue with setting up the connection.

   ![Dialog to approve that GoCardless will be accessing your payment account information](/img/connecting-your-bank/connecting-your-bank-gocardless-07.webp)

6. If your connection was a success, you will be able to click on the continue button which allows GoCardless to connect.

   <img width="510" alt="The Link Your Bank dialog with the Success! Click to continue button" src="/img/advanced/bank-sync/gocardless-success@2x.webp" />

7. A progress indicator will display while GoCardless connects to your bank to get a list of your accounts.

   <img width="510" alt="The Link Your Bank dialog saying Loading accounts" src="/img/advanced/bank-sync/gocardless-loading-accounts@2x.webp" />

8. Once the connection has been made, there will be a list of your accounts that you can choose from.

   <img width="988" alt="The Link Accounts dialog listing three bank accounts, each with a Set up bank sync button" src="/img/advanced/bank-sync/gocardless-link-accounts@2x.webp" />

9. The final step is to click **Set up bank sync** next to the account you want to sync, choose the Actual account to link it to, and click **Link accounts**.

   <img width="988" alt="The Link Accounts dialog with one bank account linked to Capital One Checking and the Link accounts button highlighted" src="/img/advanced/bank-sync/gocardless-link-accounts-chosen@2x.webp" />
   - **1.** The bank account and the Actual account it will sync with.
   - **2. Link accounts.** Saves the link and closes the dialog.

### Frequently Asked Questions

**Does Actual sync automatically with your Bank?**

At this moment, it is not yet possible for Actual to automatically sync with your bank. You need to do this manually by going to "All Accounts" and pressing "Bank Sync".

<img width="765" alt="The All Accounts page with the Bank Sync button highlighted" src="/img/advanced/bank-sync/gocardless-sync-all@2x.webp" />

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
