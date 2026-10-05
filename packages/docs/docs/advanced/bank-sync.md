# Connecting Your Bank

We are excited to offer optional bank integration in Actual.
Here are a couple of considerations to know about before making the decision to use bank sync in your installation of Actual Budget.

- This integration relies on you providing your own API credentials that you will need to get by signing up with the service provider and Generate Keys and Secrets that will be used in Actual.

- The integration only works if you are using actual-server.

- The API secrets and keys for bank sync are stored on the server and are **not** covered by [end-to-end encryption](../getting-started/sync.md#end-to-end-encryption). End-to-end encryption only protects your budget data. Server administrators or hosting providers with direct access to the server's database can read bank sync tokens. If this is a concern, consider self-hosting your server.

- You will need to add a config file to your installation.

## Supported Providers

- [Akahu](./bank-sync/akahu.md) (New Zealand Banks)
- [Enable Banking](./bank-sync/enable-banking.md) (European Banks)
- GoCardless [BankAccountData](./bank-sync/gocardless.md) (European Banks, **not accepting new accounts**)
- [SimpleFIN Bridge](./bank-sync/simplefin.md) (North American Banks)
- [Pluggy.ai](./bank-sync/pluggyai.md) (Brazilian Banks)

### Retrieve Transactions

You can fetch new transactions [automatically](#automatic-syncing) or manually.

#### Automatic Syncing

Actual can download new transactions from your linked accounts in the background. Automatic syncing is off by default.

To turn it on:

1. Open **Bank Sync** from the sidebar (on mobile, find it in the navigation menu).
2. In the **Automatic syncing** section, choose how often Actual should sync: **Every 12 hours**, **Every day** or **Every week**.
3. To use a different schedule, choose **Custom interval**, then enter a number and pick the unit (minutes, hours, days or weeks).

The **Automatic syncing** section only appears once at least one account is linked to a bank.

A few things to know:

- Syncing only happens while Actual is open. If you close Actual, it catches up the next time you open it.
- The shortest custom interval is 15 minutes. Banks limit how often accounts can be refreshed, so syncing more often than you need can use up that allowance.
- A sync runs when any linked account hasn't synced within the chosen interval. Syncs you start manually, and syncs from your other devices, count towards this, so having Actual open on several devices doesn't multiply the requests sent to your bank.
- Each automatic sync covers all of your linked accounts, not only the ones that are overdue.
- Automatic syncing is skipped while the sync server can't be reached, and tries again once the connection is back.

#### Manual Syncing

To fetch new transactions manually:

#### On Desktop

- To sync all accounts: click **All Accounts** in the sidebar, then click **Bank Sync**.
- To sync a single account: open the account and click the Bank Sync button.

  ![](/img/connecting-your-bank/connecting-your-bank-simplefin-10.webp)

#### On Mobile

- To sync all linked accounts: open **Accounts**, scroll to the top of the account list, then pull down and release to refresh.
- To sync a single account: open the account, scroll to the top of its transaction list, then pull down and release to refresh.

Pulling down to refresh on the **Budget** screen syncs your budget with the server, but does **not** fetch new bank transactions.
