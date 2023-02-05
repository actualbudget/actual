---
title: Configuring the Server
---

When it starts up, Actual looks for an optional `config.json` file in the same directory as its `package.json`. If present, any keys you define there will override the default values. Here are the supported keys:

## `https`

If you want to Actual to serve over HTTPS, you can set this key to an object with the following keys:

- `key`: The path to the private key file.
- `cert`: The path to the certificate file.
- any other options from Node’s [`tls.createServer()`](https://nodejs.org/docs/latest-v16.x/api/tls.html#tlscreateserveroptions-secureconnectionlistener), [`tls.createSecureContext()`](https://nodejs.org/docs/latest-v16.x/api/tls.html#tlscreatesecurecontextoptions), or [`http.createServer()`](https://nodejs.org/docs/latest-v16.x/api/http.html#httpcreateserveroptions-requestlistener) functions (optional, most people won’t need to set any of these).

<!-- ## `mode`

The `mode` key is not currently used by anything, as far as I can tell. It’s exposed on the `/mode` route, but that route does not appear to be called by the frontend. -->

## `port`

The `port` key is used to specify the port that the server should listen on. If not specified, the server will listen on port 5006.

## `hostname`

The `hostname` key is used to specify the hostname that the server should listen on. If not specified, the server will listen on `::` (which, on most operating systems, will include both IPv4 and IPv6).

## `serverFiles`

The server will put an `account.sqlite` file in this directory, which will contain the (hashed) server password, a list of all the budget files the server knows about, and the active session token (along with anything else the server may want to store in the future). If not specified, the server will use the `server-files` directory in the same directory as the `package.json`.

## `userFiles`

The server will put all the budget files in this directory as binary blobs. If not specified, the server will use the `user-files` directory in the same directory as the `package.json`.

If the `ACTUAL_USER_FILES` environment variable is set, it will override this value.
