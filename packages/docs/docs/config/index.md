---
title: Configuring the Server
---

When it starts up, Actual looks for an optional `config.json` file in the same directory as the sync-server's `package.json`. If you are [building from source](/docs/install/build-from-source) this will be in `packages/sync-server/`. If present, any keys you define there will override the default values. All values can also be specified as environment variables, which will override the values in the `config.json` file.

:::caution
Observe that the environmental variables do not map 1:1 to keys in the config.json file. In case of doubt, check the source schema at [/packages/sync-server/src/load-config.js](https://github.com/actualbudget/actual/blob/45530638feaacf74c28fddb846ae91170a99d94e/packages/sync-server/src/load-config.js#L43)
:::

:::info

Running into issues with your configuration not being interpreted correctly? Check out our documentation for [troubleshooting the server](/docs/troubleshooting/server.md) for information on how to enable debug logging to track down the issue.

:::

## `ACTUAL_DATA_DIR` (config.json: `dataDir`)

This is where the server stores the budget data files (and configurations unless `ACTUAL_CONFIG_PATH` is set).

By default, the server will use the `/data` directory if it exists, or the current directory (`/`) if not.

See also sections on `userFiles` and `serverFiles`.

## `ACTUAL_CONFIG_PATH`

This is the path to the config file. If not specified, the server will look for a `config.json` file in the
`/data` folder if it is present or in the sync-server's root directory if `/data` is absent.

See the `ACTUAL_DATA_DIR` section above to override the data folder location.

You can't specify this option in `config.json` since it needs to be used to find the `config.json` in the first place.

## `ACTUAL_UPLOAD_FILE_SYNC_SIZE_LIMIT_MB`

Defines the maximum allowed size for sync files (in MB).

The default value is `20`.

## `ACTUAL_UPLOAD_SYNC_ENCRYPTED_FILE_SYNC_SIZE_LIMIT_MB`

Defines the maximum allowed size for encrypted sync files (in MB).

The default value is `50`.

## `ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB`

Defines the general maximum file size limit (in MB) for uploads.

The default value is `20`.

## `https`

If you want Actual to serve over HTTPS, you can set this key to an object with the following keys:

- `key`: The path to the private key file. (environment variable: `ACTUAL_HTTPS_KEY`)
- `cert`: The path to the certificate file. (environment variable: `ACTUAL_HTTPS_CERT`)
- any other options from Node's [`tls.createServer()`](https://nodejs.org/api/tls.html#tlscreateserveroptions-secureconnectionlistener), [`tls.createSecureContext()`](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions), or [`http.createServer()`](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) functions (optional, most people won't need to set any of these).

See [Activating HTTPS](/config/https.md) for more information on how to get HTTPS working.

<!-- ## `mode`

The `mode` key is not currently used by anything, as far as I can tell. It's exposed on the `/mode` route, but that route does not appear to be called by the frontend. -->

## `port`

The `port` key is used to specify the port that the server should listen on. If not specified, the server will listen on port 5006. (environment variable: `ACTUAL_PORT`)

## `hostname`

The `hostname` key is used to specify the hostname that the server should listen on. If not specified, the server will listen on `::` (which, on most operating systems, will include both IPv4 and IPv6). (environment variable: `ACTUAL_HOSTNAME`)

## `serverFiles`

The server will put an `account.sqlite` file in this directory, which will contain the (hashed) server password, a list of all the budget files the server knows about, and the active session token (along with anything else the server may want to store in the future). If not specified, the server will use either `/data/server-files` (if `/data` exists) or the `server-files` directory in the same directory as the `package.json`. (environment variable: `ACTUAL_SERVER_FILES`)

See the `ACTUAL_DATA_DIR` section above to override the data folder location.

## `userFiles`

The server will put all the budget files in this directory as binary blobs. If not specified, the server will use either `/data/user-files` (if `/data` exists) or the `user-files` directory in the same directory as the `package.json`. (environment variable: `ACTUAL_USER_FILES`)

See the `ACTUAL_DATA_DIR` section above to override the data folder location.

## `webRoot`

(Advanced, most people will not need to configure this.) The server will serve the frontend from this directory. If not specified, the server will use the files in the `@actual-app/web` package that it has installed. (environment variable: `ACTUAL_WEB_ROOT`)

If you're providing a custom frontend, make sure you provide an `index.html` in the top level of the `webRoot` directory, which will be served from the `/` route.

## `loginMethod`

Change the default authentication method for Actual (environment variable: `ACTUAL_LOGIN_METHOD`). The valid values are:

- `"password"` (default) - This is standard password authentication
- `"header"` - Use the HTTP header `x-actual-password` to automatically login. This is for advanced use and if not done correctly could have security implications.
- `"openid"` - OpenId auth (in preview)

## `allowedLoginMethods`

The list of login methods that are permitted for auth. This defaults to `['password','header','openid']` (environment variable: `ACTUAL_ALLOWED_LOGIN_METHODS`, comma separated string).

If you wish to restrict the server from accepting certain login methods, you should update this setting.

## `trustedProxies`

Updates the servers request forwarding trust to remove known proxy IPs from the client IP list. This helps identify the client IP for things like rate limiting. This defaults to known internal IP ranges: `[10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7, ::1/128]` (environment variable: `ACTUAL_TRUSTED_PROXIES`, comma separated string).

## `trustedAuthProxies`

Configure the clients that are allowed to authenticate with HTTP headers. This defaults to what is set in `trustedProxies`, but can be overridden independently. (environment variable: `ACTUAL_TRUSTED_AUTH_PROXIES`, comma separated string).
