# Enable Banking Setup

<ExperimentalFeatureWarning issueId="7799" />

:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](../../experimental/index.md) for instructions to enable experimental features. Use the `nightly` images for the latest implementation.
:::

## Before You Start

- **Turn on the experimental feature.** Go to **Settings → Experimental** and tick **Enable Banking sync (EU banks)**. The option only shows up when Actual is connected to a server. See [Experimental Features](../../experimental/index.md) for more details.
- **Use a server that is reachable over HTTPS.** Enable Banking only sends you back to addresses that start with `https://`.
- **Do the setup in a web browser.** Open the address of your server in a browser instead of using the desktop app. The desktop app shows a redirect URL that starts with `app://`, which Enable Banking does not accept. Accounts you link in the browser can be synced from the desktop app afterwards.
- **Use one Enable Banking application for everything.** Actual stores a single set of Enable Banking credentials for the whole server, shared by all budget files. Link all your banks through the same application. Setting up a second application replaces the first one, and the accounts linked through the first one stop syncing.

## Create an Enable Banking Application

To set up Enable Banking, start by creating and signing in to your account: https://enablebanking.com/sign-in/

1. Create a new application: https://enablebanking.com/cp/applications.

- Select **Production**
- Make sure the redirect URL uses `https`, your domain and `/enablebanking/auth_callback` as the URL path

```text
  Application Name: Actualbudget
  Allowed redirect URLs: https://actualbudget.example.com/enablebanking/auth_callback
```

- If you fill in the privacy policy and terms of service links, write them out in full, starting with `https://`. Users have reported an "Invalid URL" error from Enable Banking when that prefix is missing.
- Press **Register**

2. Link the accounts you want in the Enable Banking interface. If you don't you won't see a list of banks or list of accounts in Actual Budget later on.
3. Copy the Application ID (`12345678-1234-1234-1234-123456789012`) before going back to Actual Budget.

## Link Your Accounts in Actual

Go to **More → Bank Sync**, choose **Set up Enable Banking**, paste the App ID, and upload the credential file. If Enable Banking does not accept the details, Actual shows the reason and you can correct them and try again.

Now go to an Actual Budget account and select **Link account → Enable Banking**. Select your country and bank, then follow the prompts to link your account.

## Reauthorize Your Bank

The access you give to your bank lasts for 90 days at most, and some banks allow less. When it runs out, syncing stops and the account page shows the message **This account is experiencing connection problems. Let's fix it.**

1. Click the message and choose **Reauthorize**.
2. Select your country and bank again, click **Link bank in browser** and approve the access with your bank.
3. In the **Link Accounts** window, click **Set up bank sync** next to each bank account and pick your existing account under **Account in Actual**, then click **Link accounts**.

Take care to pick the Actual account that belongs to each bank account. Your existing transactions are kept.

## Using a Reverse Proxy

When you sync, Actual passes the IP address of your device on to your bank. This tells the bank that you started the sync yourself. Banks can limit how often your data is fetched when that address is missing.

If Actual runs behind a [reverse proxy](../../config/reverse-proxies.md), it can only see your address when the proxy is listed in the [`trustedProxies`](../../config/index.md#trustedproxies) setting. The default list does not include `127.0.0.1`, so a proxy that runs on the same machine as Actual may need to be added.
