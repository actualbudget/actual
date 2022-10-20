---
title: 'Docker'
sidebar_position: 2
---

## Hosting Actual on a home server with Docker

Actual is also available as a Docker image ready to be run in your own custom environment.

* [Docker Hub](https://hub.docker.com/r/jlongster)
* [Github Registry](https://ghcr.io/actualbudget/actual-server)

## Docker Tags

We publish a number of tags to the official repository now so that users who want to get the latest bleeding edge changes can do that without having to wait for the latest image to be updated. Details of the available tags are below. 

:::note
[SemVer](https://github.com/semver/semver/blob/master/semver.md) relates to the Semantic Version number
:::

### Latest Tag

Auto-updated to point to the most recent semver build (see the [workflow docs](https://github.com/marketplace/actions/docker-metadata-action#typeedge)) 👈 this is for people who want the stable build.

* latest
* latest-alpine - Based on Alpine Linux, which is tiny so great for low powered devices.
  
### Edge Tag

This tag reflects the last commit of the active branch on your Git repository.

* edge 
* edge-alpine - Based on Alpine Linux, which is tiny so great for low powered devices.

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
