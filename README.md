This is the main project to run [Actual](https://github.com/actualbudget/actual), a local-first personal finance tool. It comes with the latest version of Actual, and a server to persist changes and make data available across all devices.

Join the [discord](https://discord.gg/pRYNYr4W5A)!

## Non-technical users

We are working on simpler one-button click deployments of Actual. This will reduce the friction for people not as comfortable with the command line. Some non-official options are listed at the bottom.

## Running

It's very easy to get started. Clone this repo, install deps, and start it:

```
git clone https://github.com/actualbudget/actual-server.git
cd actual-server
yarn install
yarn start
```

Go to https://localhost:5006 in your browser and you'll see Actual.

## Running via Docker

To run using a Docker container you can use following commands;

```
git clone https://github.com/actualbudget/actual-server.git
cd actual-server
docker build -t actual-server .
docker run -p 5006:5006 actual-server
```

The multi-arch Docker container image runs on amd64, arm64, and armv7 platforms. Please be warned that Actual may be sluggish on armv7, but users report that it does work.

## Deploying

You should deploy your server so it's always running. We recommend [fly.io](https://fly.io) which makes it incredibly easy and provides a free plan.

[fly.io](https://fly.io) allows running the application directly and provides a free tier. You should be comfortable with using the command line to set it up though.

[Create an account](https://fly.io/app/sign-in). Although you are required to enter payment details, everything we do here will work on the free tier and you won't be charged.

Next, [install the `flyctl`](https://fly.io/docs/flyctl/installing/) utility. Run `flyctl auth login` to sign into your account.

Copy `fly.template.toml` to `fly.toml`. Open `fly.toml` and customize the app name on the first line of the file.

Now, run `flyctl launch` from `actual-server`. You should have a running app now! To get to the Actual UI, simply run `flyctl open`

Whenever you want to update Actual, update the versions of `@actual-app/api` and `@actual-app/web` in `package.json` and run `flyctl deploy`.

### Using a custom Docker setup

Actual is also available as a Docker image ready to be run in your own custom environment.

- Docker Hub: `actualbudget/actual-server`
- Github Registry: `ghcr.io/actualbudget/actual-server`

### Persisting server data

One problem with the above setup is every time you deploy, it will wipe away all the data on the server. You'll need to bootstrap the instance again and upload your files.

Let's move the data somewhere that persists. With [fly.io](https://fly.io) we can create a [volume](https://fly.io/docs/reference/volumes/). Run this command:

```
flyctl volumes create actual_data
```

Now we need to tell Actual to use this volume. Add this in `fly.toml`:

```
[mounts]
  source="actual_data"
  destination="/data"
```

That's it! Actual will automatically check if the `/data` directory exists and use it automatically.

### One-click hosting solutions

These are non-official methods of one-click solutions for running Actual. If you provide a service like this, feel free to open a PR and add it to this list. These run Actual via a Docker image.

- PikaPods: [Run on PikaPods](https://www.pikapods.com/pods?run=actual)

## Configuring the server

The server accepts several configuration options, including for HTTPS certificates and various file paths. The documentation website has [a page dedicated to configuration options](https://actualbudget.github.io/docs/Installing/Configuration)

## Configuring the server URL

The Actual app is totally separate from the server. In this project, they happen to both be served by the same server, but the app doesn't know where the server lives.

The server could live on a completely different domain. You might setup Actual so that the app and server are running in completely separate places.

Since Actual doesn't know what server to use, the first thing it does is asks you for the server URL. If you are running this project, simply click "Use this domain" and it will automatically fill it in with the current domain. This works because we are serving the app and server in the same place.
