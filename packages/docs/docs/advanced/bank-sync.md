# Connecting Your Bank

We are excited to offer optional bank integration in Actual.
Here are a couple of considerations to know about before making the decision to use bank sync in your installation of Actual Budget.

- This integration relies on you providing your own API credentials that you will need to get by signing up with the service provider and Generate Keys and Secrets that will be used in Actual.

- The integration only works if you are using actual-server.

- The API secrets and keys for bank sync are stored on the server and are **not** covered by [end-to-end encryption](/docs/getting-started/sync/#end-to-end-encryption). End-to-end encryption only protects your budget data. Server administrators or hosting providers with direct access to the server's database can read bank sync credentials. If this is a concern, consider self-hosting your server.

- You will need to add a config file to your installation.

## Bank Sync Credentials

When you set up a bank sync provider, Actual stores the provider credentials on your Actual server. The setup dialog lets you choose how those credentials are used:

- **For this budget only**: The credentials are used only by the current synced budget file. This is selected by default.
- **Global**: The credentials can be used by any synced budget file on the same server that does not have its own credentials for that provider.

If both exist for the same provider, the credentials for the current budget file take precedence. If they do not exist, Actual falls back to the global credentials. Credentials created before this option existed are treated as global credentials.

The Bank Sync page shows a badge on each provider card so you can see whether that provider is using **this budget only** or **Global** credentials.

### Permissions

Admins can create and reset global credentials, and they can also manage credentials for an individual budget file. Budget file owners who are not admins can create and reset credentials for their own budget file only; the setup dialog keeps **For this budget only** selected for them. Users who have shared access to a budget file but are not the owner cannot manage bank sync credentials for that file.

If a provider is using global credentials, admins need to reset those credentials before setting up new global credentials. A budget file owner can instead set up credentials for that budget file, which will take precedence over the global credentials for that file.

### Resetting Credentials

Resetting credentials removes the credentials for the current budget file first. If the current budget file does not have credentials for that provider, resetting removes the global credentials instead. After resetting, the provider card will refresh to show the credentials that are still available, if any.

## Supported Providers

- [Enable Banking](/docs/advanced/bank-sync/enable-banking) (European Banks)
- GoCardless [BankAccountData](/docs/advanced/bank-sync/gocardless/) (European Banks, **not accepting new accounts**)
- [SimpleFIN Bridge](/docs/advanced/bank-sync/simplefin) (North American Banks)
- [Pluggy.ai](/docs/advanced/bank-sync/pluggyai) (Brazilian Banks)

### Retrieve Transactions

Actual does **not** sync bank data automatically. To fetch new transactions manually:

- To sync all accounts: click **All Accounts** in the sidebar, then click **Bank Sync**.
- To sync a single account: open the account and click the Bank Sync button.

  ![](/img/connecting-your-bank/connecting-your-bank-simplefin-10.webp)
