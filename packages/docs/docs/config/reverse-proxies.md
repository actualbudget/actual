---
title: Using a Reverse Proxy
---

# Using a Reverse Proxy

If you want to expose Actual to the internet, you should hide it behind a reverse proxy with SSL enabled.
There are a series of tools that can be used for this purpose. This configuration page is dynamic, so that new tools and their configuration can be added continuously.

In our examples, the Actual Server should be published under the domain **budget.example.org**.

:::note
The **basic configurations** provided here are only suggestions for implementing a reverse proxy configuration. Additional security mechanisms should then be activated/implemented for the tool selected in each case.
:::

## CADDY

Below is an example `Caddyfile` that you can use to configure Caddy and Actual Server using Docker. Caddy is an easy reverse proxy to use since it automatically obtains and renews SSL certificates for you.

```yaml title="docker-compose.yml"
services:
  caddy:
    image: caddy:alpine
    container_name: caddy
    restart: unless-stopped
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy/data:/data
      - ./caddy/config:/config
    ports:
      - '80:80'
      - '443:443'

  actual-server:
    image: actualbudget/actual-server:latest
    container_name: actual_server
    restart: unless-stopped
    volumes:
      - ./actual-data:/data
```

Caddyfile:

```
budget.example.org {
    encode gzip zstd
    reverse_proxy actual_server:5006
}
```

## Traefik

Our example shows a working configuration for Traefik and Actual Server using Docker - as documented in [Install Actual/Docker](../install/docker.md)

```yaml title="docker-compose.yml"
services:
  traefik:
    image: traefik:latest
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - './traefik.yaml:/etc/traefik/traefik.yaml'
      - './traefik/data:/data'
      - '/var/run/docker.sock:/var/run/docker.sock'

  actual-server:
    image: actualbudget/actual-server:latest
    restart: unless-stopped
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.actual-server.rule=Host(`budget.example.org`)'
      - 'traefik.http.routers.actual-server.entrypoints=websecure'
      - 'traefik.http.services.actual-server.loadbalancer.server.port=5006'
    volumes:
      - ./actual-data:/data
```

```yaml title="traefik.yaml"
entryPoints:
  web:
    address: ':80'
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ':443'
    http:
      tls:
        certResolver: le

providers:
  docker: {}

certificatesResolvers:
  letsencrypt:
    acme:
      email: you@example.com
      storage: /data/letsencrypt.json
      httpChallenge:
        entryPoint: web
```

Please refer to the [official documentation](https://doc.traefik.io/traefik/user-guides/docker-compose/basic-example/) for further details.

## NGINX

### Note on Cross-Origin Isolation & Header Collisions

Actual Budget requires a "Secure Context" and specific headers (`COOP/COEP`) to enable `SharedArrayBuffer` for its underlying SQLite engine. While the application attempts to set these headers automatically, implementing a manual Nginx configuration as suggested above can lead to **duplicate headers** (e.g., `require-corp, require-corp`).

Modern browsers will invalidate security policies if headers are duplicated, resulting in a `SharedArrayBufferMissing` fatal error.

To resolve the "additional security mechanisms" mentioned in the note above, use the `proxy_hide_header` directive to ensure Nginx acts as the single source of truth:

```nginx
location / {
    proxy_pass http://actual_server:5006;

    # Prevents header duplication between Upstream and Proxy
    proxy_hide_header Cross-Origin-Embedder-Policy;
    proxy_hide_header Cross-Origin-Opener-Policy;

    # Explicitly set mandatory security headers
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Origin-Agent-Cluster "?1" always;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

The SSL certificate is issued by Let's Encrypt. The [Certbot](https://certbot.eff.org/instructions) tool provides options for automatic updating upon expiration.
At the very least you will need to adapt `server_name` and the `ssl_certificate/ssl_certificate_key` paths to match your setup.
Please refer to their [official documentation](https://nginx.org/en/docs/) for further details.

```nginx title="NGINX Example Config"
server {
  listen 443 ssl;
  listen [::]:443 ssl;
  server_name budget.*;

  include /config/nginx/ssl.conf;
  client_max_body_size 0;

  # With SSL via Let's Encrypt
  ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem; # managed by Certbot
  ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem; # managed by Certbot
  include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

  location / {
    include /config/nginx/proxy.conf;
    include /config/nginx/resolver.conf;

    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;

    set $upstream_app actual-server;
    set $upstream_port 5006;
    set $upstream_proto http;
    proxy_pass $upstream_proto://$upstream_app:$upstream_port;
  }
}
```

## Apache httpd

Apache HTTP server can serve as a reverse proxy using [VirtualHosts](https://httpd.apache.org/docs/2.4/vhosts/examples.html). This snippet would be added to the bottom of httpd.conf or in a new site.conf in the sites-available folder. Certbot is supported on httpd but is not used in this example

```
<VirtualHost *:443>
  ServerName budget.example.com
  SSLProxyCheckPeerName off
	SSLProxyVerify none
  SSLEngine on
  SSLProxyEngine on
  SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
  SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

  ProxyPreserveHost On
  RequestHeader set X-Forwarded-Proto "https"
  RequestHeader set X-Forwarded-Port "443"

  # IP in the following lines can be a remote host, or a container IP
  ProxyPass / http://127.0.0.1:5006/
  ProxyPassReverse / http://127.0.0.1:5006/
</VirtualHost>
```

## Ngrok

[Ngrok](https://ngrok.com/) offers a reverse proxy and a static domain for [free](https://ngrok.com/docs/pricing-limits/free-plan-limits/). You'll need to create an account with them and follow the instructions on their [dashboard](https://dashboard.ngrok.com/) getting started section. The instructions will guide you through configuring ngrok.

Creating a free Ngrok domain is very simple: just navigate to the Domains section of the site. For more information, check out the [custom domain docs](https://ngrok.com/docs/guides/other-guides/how-to-set-up-a-custom-domain/).

Once that's all done, you can expose Actual to the internet with your custom domain and free SSL with a simple command:

```
ngrok http --url=your-custom-domain.ngrok-free.app 5006
```

If running Actual on your PC, you may find it helpful to run this command when your computer starts up. There are many ways to do this. The below is not a complete list:

- On Windows, you can use the [Task Scheduler](https://www.technipages.com/scheduled-task-windows/)
  - Create a _Basic Task_, give it a name then set the trigger to _At system startup_
  - Under _Action_, select the program as ngrok.exe, and add arguments `http --url=your-custom-domain.ngrok-free.app 5006`.
  - Once complete, you can choose to run this silently in the background by navigating to _properties_, selecting _Run whether user is logged on or not_, and ticking the _Hidden_ box.

- On Linux, you can use [systemd](https://systemd.io/)
  - Navigate to the directory: `/etc/systemd/system/` and create a service file `expose-actual-server.service`
  - Add the following content (and change to suit your needs):

    ```
    [Unit]
    Description=Run my Bash script at startup
    After=network.target

    [Service]
    ExecStart=ngrok http --url=<your-custom-domain>.ngrok-free.app 5006
    Restart=always
    User=<your user>

    [Install]
    WantedBy=multi-user.target
    ```

  - Enable the service with `sudo systemctl enable expose-actual-server.service`
