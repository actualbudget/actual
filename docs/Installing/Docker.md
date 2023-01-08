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

## Launch container using Docker Compose

Pre-requisites:  Docker

A [docker-compose file](https://github.com/actualbudget/actual-server/raw/master/docker-compose.yml) is provided together with a [.env
file](https://github.com/actualbudget/actual-server/raw/14eb9e969ac3aa878aa098736c34d7761d3c88f7/actual_server.env).
These are you need to deploy Actual in your server with docker and you **only** need to edit the
[.env
file](https://github.com/actualbudget/actual-server/raw/14eb9e969ac3aa878aa098736c34d7761d3c88f7/actual_server.env).
The options for port assignments and persisting your budget on a volume mounted on your filesystem are all contained in the env file.  This method will build and launch the most current build available from GitHub.


To create and run the container:

```bash
$ docker-compose --env-file actual_server.env up -d
```

## Launch container using docker command

Pre-requisites:  Docker

Alternatively to using docker compose, you may also launch docker using this command.  This command, as shown, will launch the latest stable build of Actual.

```bash
$ docker run --pull=always --restart=unless-stopped -d -p 5006:5006 -v YOUR/PATH/TO/DATA:/data --name my_actual_budget jlongster/actual-server:latest
```

`--pull=always` -- always pulls the latest image

`--restart=unless-stopped` -- sets the restart policy of the container

`-d` -- starts the container as background application

`-p 5006:5006` -- sets the port to access Actual.  (HOST PORT:DOCKER PORT)

`-v YOUR/PATH/TO/DATA:/data` -- tells the container where to store your budget data.  This persists the data on your hard disk so it isn't lost if you remove the container.  Change the current value to a folder on your host computer.

`--name my_actual_budget` -- gives your new docker container a name

`jlongster/actual-server:latest` -- defines which image you want to pull and launch.

To update the container from a new image, use these commands.

```bash
$ docker stop my_actual_budget
```

```bash
$ docker container rm my_actual_budget
```

```bash
$ docker run --pull=always --restart=unless-stopped -d -p 5006:5006 -v YOUR/PATH/TO/DATA:/data --name my_actual_budget jlongster/actual-server:latest
```  

You can place all of these in a batch script for a 1 click or single command update.

```bash
$ docker stop my_actual_budget && docker container rm my_actual_budget && docker run --pull=always --restart=unless-stopped -d -p 5006:5006 -v YOUR/PATH/TO/DATA:/data --name my_actual_budget jlongster/actual-server:latest
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

## Sample Files

Below you will find a selection of sample files for Actual Budget that work with Docker

### actual_server.env

```bash
# This files contains all the variables you may need to change to set up Actual budget.

# Server data location of Actual
dataPath=./data

# Actual web app port
externalPort=5006
```

### actual.subdomain.conf.sample

```json
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name budget.*;

    include /config/nginx/ssl.conf;

    client_max_body_size 0;

    # enable for ldap auth, fill in ldap details in ldap.conf
    #include /config/nginx/ldap.conf;

    # enable for Authelia
    #include /config/nginx/authelia-server.conf;

    location / {
        # enable the next two lines for http auth
        #auth_basic "Restricted";
        #auth_basic_user_file /config/nginx/.htpasswd;

        # enable the next two lines for ldap auth
        #auth_request /auth;
        #error_page 401 =200 /ldaplogin;

        # enable for Authelia
        #include /config/nginx/authelia-location.conf;

        include /config/nginx/proxy.conf;
        include /config/nginx/resolver.conf;
        set $upstream_app actual_budget;
        set $upstream_port 5006;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;

    }
}
```
### docker-compose.yml

```yml
version: "3"
services:
  actual_server:
    container_name: actual_server
    build:
      context: ./
      dockerfile: Dockerfile
    ports:
      - "${externalPort}:5006"
    volumes:
      - ${dataPath}:/data
    restart: unless-stopped
```