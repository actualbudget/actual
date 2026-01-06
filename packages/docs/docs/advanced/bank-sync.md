# Connecting Your Bank

We are excited to offer optional bank integration in Actual.
Here are a couple of considerations to know about before making the decision to use bank sync in your installation of Actual Budget.

- This integration relies on you providing your own API credentials that you will need to get by signing up with the service provider and Generate Keys and Secrets that will be used in Actual.

- The integration only works if you are using actual-server.

- The Secrets and Keys are stored in your Actual installed version so it is highly recommended to turn on End to End encryption and create a strong passphrase to encrypt your files.

- You will need to add a config file to your installation.

## Supported Providers

- GoCardless [BankAccountData](/docs/advanced/bank-sync/gocardless/) (European Banks, **not accepting new accounts**)
- [SimpleFIN Bridge](/docs/advanced/bank-sync/simplefin) (North American Banks)
- Pluggy.ai (Brazilian Banks - [**Experimental feature**](/docs/experimental/pluggyai))

### Retrieve Transactions

Actual does **not** sync bank data automatically. To fetch new transactions manually:

- To sync all accounts: click **All Accounts** in the sidebar, then click **Bank Sync**.
- To sync a single account: open the account and click the Bank Sync button.

  ![](/img/connecting-your-bank/connecting-your-bank-simplefin-10.webp)
