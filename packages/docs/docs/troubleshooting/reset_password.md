# Resetting Actual Login Password

If you have forgotten your actual-server login password - not all is lost, as the password can be reset without losing any of your files / data.

A password reset feature is available from version 23.4.2.

## Execute Directly

```sh
npm run reset-password
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

The script will prompt through requesting a new password and confirming it. Once set - you can login with the new password.
