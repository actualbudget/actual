---
title: Configuring the Server
---

When it starts up, Actual looks for an optional `config.json` file in the same directory as its `package.json`. If present, any keys you define there will override the default values. All values can also be specified as environment variables, which will override the values in the `config.json` file.

## `ACTUAL_CONFIG_PATH`

This is the path to the config file. If not specified, the server will look for a `config.json` file in the same directory as the `package.json`. This can only be specified as an environment variable.

## `https`

If you want to Actual to serve over HTTPS, you can set this key to an object with the following keys:

- `key`: The path to the private key file. (environment variable: `ACTUAL_HTTPS_KEY`)
- `cert`: The path to the certificate file. (environment variable: `ACTUAL_HTTPS_CERT`)
- any other options from Node’s [`tls.createServer()`](https://nodejs.org/docs/latest-v16.x/api/tls.html#tlscreateserveroptions-secureconnectionlistener), [`tls.createSecureContext()`](https://nodejs.org/docs/latest-v16.x/api/tls.html#tlscreatesecurecontextoptions), or [`http.createServer()`](https://nodejs.org/docs/latest-v16.x/api/http.html#httpcreateserveroptions-requestlistener) functions (optional, most people won’t need to set any of these).

The value of `key` and `cert` can either be a file path or a string containing the contents of the file. If you use the environment variables, you can replace newlines with `\n` if you can’t put real newlines in your environment variable.

<!-- ## `mode`

The `mode` key is not currently used by anything, as far as I can tell. It’s exposed on the `/mode` route, but that route does not appear to be called by the frontend. -->

## `port`

The `port` key is used to specify the port that the server should listen on. If not specified, the server will listen on port 5006. (environment variable: `ACTUAL_PORT`)

## `hostname`

The `hostname` key is used to specify the hostname that the server should listen on. If not specified, the server will listen on `::` (which, on most operating systems, will include both IPv4 and IPv6). (environment variable: `ACTUAL_HOSTNAME`)

## `serverFiles`

The server will put an `account.sqlite` file in this directory, which will contain the (hashed) server password, a list of all the budget files the server knows about, and the active session token (along with anything else the server may want to store in the future). If not specified, the server will use either `/data/server-files` (if `/data` exists) or the `server-files` directory in the same directory as the `package.json`. (environment variable: `ACTUAL_SERVER_FILES`)

## `userFiles`

The server will put all the budget files in this directory as binary blobs. If not specified, the server will use either `/data/user-files` (if `/data` exists) or the `user-files` directory in the same directory as the `package.json`. (environment variable: `ACTUAL_USER_FILES`)

## `webRoot`

(Advanced, most people will not need to configure this.) The server will serve the frontend from this directory. If not specified, the server will use the files in the `@actual-app/web` package that it has installed. (environment variable: `ACTUAL_WEB_ROOT`)

If you’re providing a custom frontend, make sure you provide an `index.html` in the top level of the `webRoot` directory, which will be served from the `/` route.
