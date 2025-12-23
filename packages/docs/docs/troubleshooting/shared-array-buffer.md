# Enabling SharedArrayBuffer Access

Actual requires access to a web technology called [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) in order to function. Because of security vulnerabilities in modern CPUs, this feature is disabled until certain conditions are met. Actual will not be able to run unless your server meets these conditions.

## HTTPS

Actual must be served over HTTPS for `SharedArrayBuffer` to be enabled. If you're using a cloud provider, this will usually be done for you. See [Activating HTTPS](../config/https.md) for more information.

## HTTP Headers

In addition to the HTTPS requirement, the `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers must be set to `require-corp` and `same-origin` respectively. If you're using the default `actual-server` package as your server, you don't have to worry about this (the headers will always be enabled). If you're using a different server, you'll need to make sure these headers are set.

## Supported Browser

The browser you use to access the server must also support `SharedArrayBuffer`. Recent versions of Chrome, Firefox, Safari, and Edge all support this feature. Check out the website ["Can I Use?"](https://caniuse.com/sharedarraybuffer) for a detailed breakdown of which browser versions support the feature.
