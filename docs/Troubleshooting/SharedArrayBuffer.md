---
title: 'Enabling SharedArrayBuffer Access'
---

Actual requires access to a web technology called [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) in order to function. Because of security vulnerabilities in modern CPUs, this feature is disabled until certain conditions are met. Actual will not be able to run unless your server meets these conditions.

## HTTPS

Actual must be served over HTTPS for `SharedArrayBuffer` to be enabled. If you’re using a cloud provider, this will usually be done for you. If you’re running the server locally and only accessing it through `localhost`, this requirement doesn’t apply.

If you’re running a local server and accessing it through a domain name, you’ll need to set up HTTPS yourself. There are a few ways to do this:

1. Use a self-signed certificate. This is the easiest way to get HTTPS working, but it will cause your browser to display a warning that the certificate is invalid. Additionally, if anyone gets access to this certificate, they can intercept most secure traffic on your computer. One tool you could use to make such a certificate is [mkcert](https://github.com/FiloSottile/mkcert).
2. Connect your server to a domain you control and make it public to the Internet. You could use a tool like [certbot](https://certbot.eff.org) to generate a valid certificate once you have the domain set up.
3. Use a service like [Tailscale](https://tailscale.com/kb/1153/enabling-https/) that allows you to create a valid HTTPS certificate without having to expose your server to the wider internet.

Once you have the certificate, [pass it to Actual using the config file](/Installing/Configuration/#https).

## HTTP Headers

In addition to the HTTPS requirement, the `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers must be set to `require-corp` and `same-origin` respectively. If you’re using the default `actual-server` package as your server, you don’t have to worry about this (the headers will always be enabled). If you’re using a different server, you’ll need to make sure these headers are set.

## Supported Browser

The browser you use to access the server must also support `SharedArrayBuffer`. Recent versions of Chrome, Firefox, Safari, and Edge all support this feature. Check out the website [“Can I Use?”](https://caniuse.com/sharedarraybuffer) for a detailed breakdown of which browser versions support the feature.
