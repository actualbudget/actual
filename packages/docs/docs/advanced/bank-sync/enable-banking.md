# Enable Banking Setup

<ExperimentalFeatureWarning issueId="7799" />

:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](../../experimental/index.md) for instructions to enable experimental features. Use the `nightly` images for the latest implementation.
:::

To set up Enable Banking, start by creating and signing in to your account: https://enablebanking.com/sign-in/

Create a new application: https://enablebanking.com/cp/applications. Select **Production** and make sure the redirect URL uses `https` and your domain.

```text
Application Name: Actualbudget
Allowed redirect URLs: https://actualbudget.example.com/enablebanking/auth_callback
```

Press **Register**, then link the accounts you want in the Enable Banking interface. Copy the Application ID (`12345678-1234-1234-1234-123456789012`) before going back to Actual Budget.

Go to **More → Bank Sync**, choose **Set up Enable Banking**, paste the App ID, and upload the credential file. The setup dialog lets you save the credentials **For this budget only** or as **Global** credentials. **For this budget only** is selected by default.

Now go to an Actual Budget account and select **Link account → Enable Banking**. Select your country and bank, then follow the prompts to link your account.
