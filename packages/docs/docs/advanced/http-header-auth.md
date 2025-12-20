# Authenticating With HTTP Headers

:::note
Client Version 24.6.0 and
Server Version 24.6.0 or higher are required for this feature.
:::

This feature will allow Actual to use an HTTP header to automatically authenticate and log in without prompting for a password. This is useful for individuals who run SSO services like [Authentik](https://goauthentik.io/), [Authelia](https://www.authelia.com/), and more.

## Setup

This feature needs to be enabled on the server, it is not configured to work out of the box. In the Actual config, set the value `loginMethod` or env `ACTUAL_LOGIN_METHOD` to `"header"`. This will enable header authentication, but the normal password authentication will still work as a fallback.

:::warning
Be careful! A misconfiguration on this next step could make your instance available to the whole internet.
:::

The SSO provider then needs to be configured to pass an extra HTTP header to Actual. The details on how to do this are unique to the SSO provider, but the header `x-actual-password` needs to be set to your actual password.

If your setup needs it, it is possible to configure trusted proxies for authentication. See [`trustedAuthProxies` configuration](../config/index.md#trustedAuthProxies) for details.

:::note
This feature is not an HTTP basic auth, but a different form of using a password. For HTTP basic auth or user accounts see [this issue](https://github.com/actualbudget/actual/issues/524)
:::
