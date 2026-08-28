# FOB Statements Setup

[FOB Statements](https://statements.finopsbricks.com/) is a system of record for bank and credit card transactions. If you already keep your statements there, you can link those accounts to Actual and have your transactions downloaded automatically.

### Create API Credentials in FOB Statements

1. Sign in to [FOB Statements](https://statements.finopsbricks.com/).
2. Open your organization settings and go to the **API Keys** section.
3. Create a new API key. A **key** and a **secret** will be generated.
4. Store both values securely. You will need them in Actual. A read-only key is enough for bank sync.

### Set Up FOB Statements in Actual

1. In Actual, click **"+ Add account"** at the bottom of the sidebar.
2. Select **"Set-up FOB Statements for bank-sync."**
3. In the dialog that appears, enter:
   - **API key**: from your FOB Statements organization settings.
   - **API secret**: from your FOB Statements organization settings.
   - **API URL** (optional): only needed if you run a self-hosted FOB Statements instance. Leave it blank to use the default.
4. If you want these credentials to apply to only the current budget rather than the whole server, turn on **For this budget only**.
5. Click **Save and continue**. The credentials are securely stored on the server.

### Link Accounts with FOB Statements

1. In Actual, link a bank account (existing or new):
   - For an **existing account**, click it, then open the `...` menu and choose **Link Account**.
   - For a **new account**, click **"+ Add account"** in the sidebar.
2. Choose **FOB Statements** as the bank sync provider.
3. A list of the accounts in your FOB Statements organization will appear. You do not have to link all of them — pick only the accounts you want to track in Actual and leave the rest unlinked.
4. For each account you want to sync, choose the Actual account to link it to, or create a new one.

### Choosing a Starting Date and Opening Balance

FOB Statements can hold many years of history. To avoid importing more than you need, each new account you link has a **Starting Date**. Only transactions on or after that date are downloaded.

When you set a starting date for a FOB Statements account, Actual automatically fills in the **Starting Balance** using the account balance as of that date, so the running balance in Actual matches FOB Statements. You can edit the starting balance if you prefer a different value.

### Resetting FOB Statements Credentials

To reset your FOB Statements connection:

1. In Actual, click **Add Account**.
2. Next to "Set-up FOB Statements for bank-sync", open the three-dot menu.
3. Click **Reset FOB Statements credentials**.

You will then need to enter a new API key and secret to reconnect.

### Notes and Limitations

1. FOB Statements records are settled transactions, so there are no pending transactions to import.
2. Credit card accounts are imported as liabilities, so their balances appear as negative amounts in Actual.
3. How often new data is available depends on how frequently statements are added in FOB Statements.
