# open-banking.io Setup

<ExperimentalFeatureWarning issueId="8394" />

:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](../../experimental/index.md) for instructions to enable experimental features. Use the `nightly` images for the latest implementation.
:::

[open-banking.io](https://open-banking.io) provides bank-sync coverage across the EEA and the UK, with support for 2,600+ banks. It is **zero-knowledge**: the credential bundle is decrypted on your own Actual sync-server, and the service never sees your plaintext account data.

To set up open-banking.io, start by creating and signing in to your account: https://open-banking.io

Register your application and link the accounts you want, then export your credentials bundle. This downloads a `credentials.json` file that contains everything your sync-server needs to connect.

Go to **More → Bank Sync**, choose **Set up open-banking.io**, and paste the full contents of your `credentials.json` bundle. The credentials are stored on your server, so you only need to enter them once.

Now go to an Actual Budget account and select **Link account → open-banking.io**. Select the account you want to connect and follow the prompts to link it.
