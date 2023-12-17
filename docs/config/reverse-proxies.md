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
    container_name: caddy
    image: caddy:alpine
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy/data:/data
      - ./caddy/config:/config 
    ports:
      - "80:80"
      - '443:443'

  actual-server:
    image: actualbudget/actual-server:latest
    container_name: actual_server
    restart: unless-stopped
    volumes:
      - ./actual-data:/data
    restart: unless-stopped
    ports:
      - '5006:5006'
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
      - "80:80"
      - "443:443"
    volumes:
      - "./traefik.yaml:/etc/traefik/traefik.yaml"
      - "./traefik/data:/data"
      - "/var/run/docker.sock:/var/run/docker.sock"

  actual-server:
    image: actualbudget/actual-server:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.actual-server.rule=Host(`budget.example.org`)"
      - "traefik.http.routers.actual-server.entrypoints=websecure"
    volumes:
      - ./actual-data:/data
    restart: unless-stopped
```

```yaml title="traefik.yaml"
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ":443"
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

The SSL certificate is issued by Let's Encrypt. The [Certbot](https://certbot.eff.org/instructions) tool provides options for automatic updating upon expiration.
At the very least you will need to adapt `server_name` and the `ssl_certificate/ssl_certificate_key` paths to match your setup. 
Please refer to their [official documentation](https://nginx.org/en/docs/) for further details.
