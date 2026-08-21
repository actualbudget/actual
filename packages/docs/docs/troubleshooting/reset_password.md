# Resetting Actual Login Password

If you have forgotten your actual-server login password - not all is lost, as the password can be reset without losing any of your files / data.

A password reset feature is available from version 23.4.2.

:::note
If your server is set up to sign in with a [passkey](../config/webauthn-auth.md) instead of a password, the same commands below also work to recover access — they clear the passkey rather than prompting for a new password. See [Losing Access to Your Passkey](../config/webauthn-auth.md#losing-access-to-your-passkey) for details.
:::

## If `actual-server` is installed on the host

The deployed server environment may not have Yarn available, so the existing npm script
is still the simplest reset path there:

```sh
npm run reset-password
```

The newer `actual-server` CLI command does the same reset with a friendlier prompt:

```sh
actual-server --reset-password
```

If you are running the sync server from a source checkout instead of the deployed server,
run the workspace script from the repository root:

```sh
yarn workspace @actual-app/sync-server reset-password
```

## From a Docker Container

```sh
docker exec -it <actual_container> /bin/sh
node /app/src/scripts/reset-password.js
```

## From a Kubernetes Instance

```sh
kubectl exec --stdin --tty <actual_pod_name> -- /bin/sh
node /app/src/scripts/reset-password.js
```

If your server currently uses a password, both commands will prompt for a new password and
ask you to confirm it; once the reset completes, you can sign in with the new password. If
your server currently uses a passkey instead, the commands clear it without prompting for
anything — open Actual in your browser afterward to register a new passkey or set a password.
