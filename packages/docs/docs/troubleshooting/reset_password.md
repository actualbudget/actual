# Resetting Actual Login Password

If you have forgotten your actual-server login password - not all is lost, as the password can be reset without losing any of your files / data.

A password reset feature is available from version 23.4.2.

## If `actual-server` is installed on the host

```sh
actual-server --reset-password
```

If you are running the sync server from a source checkout instead of the installed CLI,
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

Both commands will prompt for a new password and ask you to confirm it. Once the reset
completes, you can sign in with the new password.
