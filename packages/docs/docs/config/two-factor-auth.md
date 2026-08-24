# Two-Factor Authentication

:::info
This feature requires use of [Actual Server](./index.md)
:::

Two-factor authentication adds a one-time code, from an authenticator app on
your phone, to the server password login. Once it is turned on, signing in takes
two steps: the password, then a six-digit code.

This is aimed at servers that use a plain server password. If you need multiple
users, or you already run an identity provider, use
[an OpenID provider](./oauth-auth.md) instead — most providers offer
multi-factor authentication of their own, and Actual leaves that to them.

## What You Need

Any authenticator app that supports time-based one-time passwords (TOTP), such
as Aegis, Bitwarden, 1Password, Ente Auth, or Google Authenticator.

## Turning It On

1. Open any budget file, then go to **Settings**.
2. Under **Two-factor authentication**, click _Turn on two-factor
   authentication_.
3. Scan the QR code with your authenticator app, or type the key in by hand.
4. Enter the six-digit code your app shows, then click _Turn on_.

Actual asks for that code before switching the feature on, so a mistyped key
cannot lock you out.

:::tip
Keep a copy of the key somewhere safe, such as a password manager. It is the
only way to add the account to a new authenticator app later.
:::

## Turning It Off

In **Settings**, click _Turn off two-factor authentication_ and confirm with
your server password and a current code.

## If You Lose Your Authenticator App

Run the following on the server to remove the second factor, then sign in with
your password alone:

```bash
yarn workspace @actual-app/sync-server disable-totp
```

If you run Actual in Docker, run the same command inside the container.

## Client and Server Versions

Both the client and the server need to support this feature:

- The **Two-factor authentication** section only appears in Settings if your
  server is new enough to support it.
- Once it is turned on, an older client cannot sign in — it will report that it
  is too old and needs updating. Actual never lets a client skip the code, so
  update any device you sign in from before turning this on.

## Limitations

- Two-factor authentication applies to the server password. It has no effect
  when you sign in with [an OpenID provider](./oauth-auth.md), and turning on
  OpenID removes the second factor.
- It is also skipped for
  [HTTP header authentication](../advanced/http-header-auth.md), where an
  upstream proxy has already authenticated the request. Configure
  multi-factor authentication at that proxy instead.
- There is a single second factor for the server, matching the single server
  password. Per-user codes are only possible with multiple users, which
  requires OpenID.
