---
title: 'Docker'
sidebar_position: 2
---

## Hosting Actual on a home server with Docker

Actual is also available as a Docker image ready to be run in your own custom environment. We publish the image both to [Docker Hub](https://hub.docker.com/r/actualbudget/actual-server) (as `actualbudget/actual-server`) and [GitHub's container registry](https://ghcr.io/actualbudget/actual) (as `ghcr.io/actualbudget/actual`). Actual should function the same when pulled from either registry, so you can choose whichever one you prefer.

## Docker Tags

We publish a number of tags to the official repository now so that users who want to get the latest bleeding edge changes can do that without having to wait for the latest image to be updated. Details of the available tags are below.

### `latest` Tag

The `latest` tag points to the most recent official release of Actual. This is the recommended tag to use for most users.

- `latest`
- `latest-alpine` - Based on Alpine Linux, which is tiny so it's great for low powered devices.

### `edge` Tag

The `edge` tag is updated every time a commit is pushed to the `master` branch. While we welcome people to try it out, there may be more bugs than the official release (please report any you find!). If you choose to give this tag a try, make sure you keep backups of your budget in case something goes wrong.

- `edge`
- `edge-alpine` - Based on Alpine Linux, which is tiny so great for low powered devices.

## Launch container using Docker Compose

Pre-requisites: Docker

You can use the [`docker-compose.yml` file included in the `actual` repository](https://github.com/actualbudget/actual/blob/master/packages/sync-server/docker-compose.yml) to run the latest stable version of the server.

To create and run the container:

```bash
$ docker compose up --detach
```

You can optionally configure the container using environment variables — see the [configuration section](../config/index.md) for more details.

### Update Docker Compose container

```bash
$ docker compose pull && docker compose up -d
```

## Launch container using docker command

Pre-requisites: Docker

Alternatively to using docker compose, you may also launch docker using this command. This command, as shown, will launch the latest stable build of Actual.

```bash
$ docker run --pull=always --restart=unless-stopped -d -p 5006:5006 -v YOUR/PATH/TO/DATA:/data --name my_actual_budget actualbudget/actual-server:latest
```

`--pull=always` -- always pulls the latest image

`--restart=unless-stopped` -- sets the restart policy of the container

`-d` -- starts the container as background application

`-p 5006:5006` -- sets the port to access Actual. (HOST PORT:DOCKER PORT)

`-v YOUR/PATH/TO/DATA:/data` -- tells the container where to store your budget data. This persists the data on your hard disk so it isn't lost if you remove the container. Change the current value to a folder on your host computer. The server will create `server-files` and `user-files` subfolders at this location.

`--name my_actual_budget` -- gives your new docker container a name (change this to whatever you want)

`actualbudget/actual-server:latest` -- defines which image you want to pull and launch.

### Update Docker container using docker command

```bash
$ docker stop my_actual_budget
```

```bash
$ docker container rm my_actual_budget
```

```bash
$ docker run --pull=always --restart=unless-stopped -d -p 5006:5006 -v YOUR/PATH/TO/DATA:/data --name my_actual_budget actualbudget/actual-server:latest
```

You can place all of these in a batch script for a 1 click or single command update.

```bash
$ docker stop my_actual_budget && docker container rm my_actual_budget && docker run --pull=always --restart=unless-stopped -d -p 5006:5006 -v YOUR/PATH/TO/DATA:/data --name my_actual_budget actualbudget/actual-server:latest
```

## Test connection within local network

On another PC within the local network connect to http://_serverIP_:_chosenPort_
