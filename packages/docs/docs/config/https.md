---
title: Activating HTTPS
---

You'll need to enable HTTPS on your server in order to safely use all of Actual's features. **You don't need to follow these steps** if you run the server on your own computer and only access it through `localhost`, or if you're using a cloud provider that handles HTTPS for you.

## 1. Acquire a certificate to use on your server

There are two methods to do this and both refer to not exposing Actual on the internet. If access from the internet is desired, refer to [Using a Reverse Proxy](/docs/config/reverse-proxies).

### Use a self-signed certificate

Use a self-signed certificate. This is the easiest way to get HTTPS working, but it will cause your browser to display a warning that the certificate is invalid. Additionally, if anyone gets access to this certificate, they can intercept most secure traffic on your computer.

- A command line tool like [mkcert](https://github.com/FiloSottile/mkcert) can automate this process.
- Alternately, you can manually generate the certificates. Install OpenSSL for your operating system, then run `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout selfhost.key -out selfhost.crt` in a terminal to generate the certificate and private key. You'll need to enter a two-letter country code to get the `.crt` file to be generated, but you can leave the rest of the fields blank (just hit enter at each prompt). Move the `selfhost.key` and `selfhost.crt` files to a location accessible to the Actual server.

### Obtain a certificate without exposing to the internet

Use a service like [Tailscale](https://tailscale.com/kb/1153/enabling-https/) or [Caddy](https://caddyserver.com/docs/automatic-https#dns-challenge) that allows you to create a valid HTTPS certificate without having to expose your server to the wider internet.

## 2. Configure Actual to use the certificate

Once you have the certificate, you'll need to configure Actual to use it. There are two methods to do this:

### Configuring with `config.json`

Create a `config.json` file in the same folder where you run the Actual Sync Server. If you are [building from source](/docs/install/build-from-source) this will be in `packages/sync-server/`. Put the paths to the `.key` and `.crt` files in the config file. Note: if you're using Docker or a similar container environment, make sure the paths are accessible to the container.

If using a Docker container, this folder is `/data` within the container. If you mounted a volume for the container, the folder on the host where `/data` is mounted is where you can place the `config.json` file.

`config.json`:

```json
{
  "https": {
    "key": "/data/selfhost.key",
    "cert": "/data/selfhost.crt"
  }
}
```

If using MacOS/\*nix based systems
in terminal paste the following. This will create the `config.json` in the current directory

```zsh
cat <<"EOF" | tee config.json
{
  "https": {
    "key": "/data/selfhost.key",
    "cert": "/data/selfhost.crt"
  }
}
EOF
```

### Configuring with environment variables

If you can't easily create new files, you can also configure HTTPS using environment variables. Set the `ACTUAL_HTTPS_KEY` and `ACTUAL_HTTPS_CERT` environment variables to the contents of the `.key` and `.crt` files, respectively. If you're unable to include newlines in the environment variable values, you can replace any newlines with `\n` and Actual will automatically convert them back to newlines.

### Configuring the Desktop App

To configure the desktop app, follow these steps on the _Where's the server?_ screen.

1. Enter your server URL and click OK.
2. If you see an error message asking you to select your certificate, choose the appropriate certificate and try again.

**Note:** If you have generated your certificate using [mkcert](https://github.com/FiloSottile/mkcert), specify the root CA certificate - not the certificate your server is pointing to. To do this:

1. Run the command `mkcert -CAROOT` to find the directory of the root certificate.
2. Navigate to that directory to locate the `rootCA.pem` certificate
3. Specify the `rootCA.pem` certificate in the desktop app.

## 3. Test HTTPS

Once you have acquired a certificate and configured Actual to use it, attempt to access your instance ensuring you are using `https`. It is recommended to also either re-enter the URL to your server or make a new tab/window instead of refreshing the page where you saw the error.
