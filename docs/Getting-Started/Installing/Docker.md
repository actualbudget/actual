---
title: 'Docker'
sidebar_position: 2
---

## Hosting Actual on a home server with Docker

:::caution

These instructions are written to use a PR that has not been merged!

:::

Actual is also available as a Docker image ready to be run in your own custom environment.

- Docker Hub: `jlongster/actual-server`
- Github Registry: `ghcr.io/actualbudget/actual-server`

## Launch container

A [docker-compose file](https://github.com/actualbudget/actual-server/raw/master/docker-compose.yml) is provided together with a [.env
file](https://github.com/actualbudget/actual-server/raw/14eb9e969ac3aa878aa098736c34d7761d3c88f7/actual_server.env).
These are you need to deploy Actual in your server with docker and you **only** need to edit the
[.env
file](https://github.com/actualbudget/actual-server/raw/14eb9e969ac3aa878aa098736c34d7761d3c88f7/actual_server.env).

To create and run the container:
```bash
$ docker-compose --env-file actual_server.env up -d
```

## Test connection within local network

On another PC within the local network connect to http://*serverIP*:*chosenPort*

## Expose to internet with NGINX

Use the [sample nginx conf file provided](https://github.com/actualbudget/actual-server/raw/14eb9e969ac3aa878aa098736c34d7761d3c88f7/actual.subdomain.conf.sample) and if needed change the
line with:
```text
set $upstream_port 5006;
```
to the chosen port (found [here](https://github.com/actualbudget/actual-server/raw/14eb9e969ac3aa878aa098736c34d7761d3c88f7/actual_server.env)).

Using nginx web UI:
* Scheme -> http
* Forward Hostname/IP -> actual_budget
* Forward Port -> *The chosen port (found [here](https://github.com/actualbudget/actual-server/raw/14eb9e969ac3aa878aa098736c34d7761d3c88f7/actual_server.env))*

## Configuring the server URL

The Actual app is totally separate from the server. In this project, they happen to both be served
by the same server, but the app doesn't know where the server lives.

The server could live on a completely different domain. You might setup Actual so that the app and
server are running in completely separate places.

Since Actual doesn't know what server to use, the first thing it does is asks you for the server
URL. If you are running this project, simply click "Use this domain" and it will automatically fill
it in with the current domain. This works because we are serving the app and server in the same
place.
