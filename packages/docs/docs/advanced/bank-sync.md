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

Actual does **not** sync bank data automatically. To fetch new transactions manually:

- To sync all accounts: click **All Accounts** in the sidebar, then click **Bank Sync**.
- To sync a single account: open the account and click the Bank Sync button.

  ![](/img/connecting-your-bank/connecting-your-bank-simplefin-10.webp)
