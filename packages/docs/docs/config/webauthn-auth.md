# Authenticating With a Passkey (WebAuthn)

:::info
This feature requires use of [Actual Server](./index.md)
:::

Instead of protecting your server with a password, you can register a passkey using your device's built-in authenticator (such as Windows Hello, Touch ID, or a hardware security key) or a password manager that supports passkeys. Passkeys use the [WebAuthn](https://webauthn.io/) standard, so no password is ever sent to or stored on the server.

Unlike [OpenID authentication](./oauth-auth.md), a passkey doesn't require any external provider or configuration file — you set it up entirely from the Actual web UI.

:::caution
Only one passkey is supported per server at this time, shared by whoever signs in (the same way a server password is shared today). There isn't yet a way for individual users to register their own passkeys.
:::

## Requirements

Passkeys rely on a browser feature that only works in a secure context, so your server must be served over HTTPS, or accessed at `localhost`. See [Activating HTTPS](./https.md) if your server isn't already using it.

If your browser or device doesn't support passkeys, or your server isn't served over a secure context, the option to register a passkey won't appear during setup.

## Setting Up a Passkey

The first time you open a freshly installed server, you'll be asked to choose a login method:

- **Use a password** sets a traditional server password.
- **Register a passkey** starts the passkey registration ceremony, prompting you to use your device's authenticator or password manager.

Once registration finishes, you'll be sent to the login page, where you can sign in with the passkey you just registered.

## Signing In

On the login page, select **Sign in with passkey** and follow your browser's prompt to complete the passkey ceremony.

## Losing Access to Your Passkey

There isn't yet an in-app way to switch back to a password or register a replacement passkey after setup. If you lose access to your passkey, follow the [reset password](../troubleshooting/reset_password.md) instructions — running the reset command on a server using a passkey clears it instead of prompting for a new password, and sends you back to the setup screen to register a new passkey or set a password. Your budget files and users are not affected.
