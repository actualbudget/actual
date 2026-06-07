# Enable Banking Setup

:::warning
This is an **experimental feature**. That means we're still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in the Discord.
:::
:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](/docs/experimental/) for instructions to enable experimental features. Use the `nightly` images for the latest implementation.
:::

To set up Enable Banking, start by creating and signing in to your account: https://enablebanking.com/sign-in/

Create a new application: https://enablebanking.com/cp/applications. Select **Production** and make sure the redirect URL uses `https` and your domain.

```text
Application Name: Actualbudget
Allowed redirect URLs: https://actualbudget.example.com/enablebanking/auth_callback
```

Press **Register**, then link the accounts you want in the Enable Banking interface. Copy the Application ID (`12345678-1234-1234-1234-123456789012`) before going back to Actual Budget.

Go to **More → Bank Sync**, choose **Set up Enable Banking**, paste the App ID, and upload the credential file.

Now go to an Actual Budget account and select **Link account → Enable Banking**. Select your country and bank, then follow the prompts to link your account.
