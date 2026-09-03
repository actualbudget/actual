# LHV.ai Setup

LHV.ai connects Actual Budget directly to your LHV accounts. For more information about the service, see the [LHV API setup page](https://lhv.ai/et-EE/#setup).

## Generate a Refresh Token

1. Open the [LHV.ai API access page](https://api.lhv.ai/api-access).
2. Sign in and select the client whose accounts you want to connect.
3. Allow access to your accounts and transactions.
4. Copy the refresh token. LHV.ai only displays it once.

:::note

The refresh token expires after 30 days. When Actual asks you to reconnect, repeat these steps and enter the new token. Your linked accounts remain in Actual.

:::

## Link Your Accounts

1. In Actual, click **Add account** at the bottom of the sidebar.
2. Select **Link bank account with LHV.ai**.
3. Paste the refresh token and click **Save and continue**.
4. Link each LHV account to an existing Actual account or create a new account.
5. Click **Link accounts**.

Actual imports booked transactions when you run bank sync. Card reservations are not imported.
