
**Note from maintainer: don't expect responses or PR merges until May 16th.** 🏖️

I (@jlongster) am currently away on vacation and not checking this. I am currently the only maintainer of Actual (person able to merge PRs, etc). I'd like to fix this soon and if you are interested in helping, please help manage issues & PRs and I will bring on consistent contributors as maintainers.

**Please help** by making it as clear as possible what changes are being made. When I get back this will greatly help triage the work.

When I get back, I will work on guides and structure to help anyone get involved, particularly explaining how the code works.

---

This is the main project to run [Actual](https://github.com/actualbudget/actual), a local-first personal finance tool. It comes with the latest version of Actual, and a server to persist changes and make data available across all devices.

Join the [discord](https://discord.gg/pRYNYr4W5A)!

## Non-technical users

We are looking into a feature for one-button click click deployment of Actual. This will reduce the friction for people not as comfortable with the command line.

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


## Deploying

You should deploy your server so it's always running. We recommend [fly.io](https://fly.io) which makes it incredibly easy and provides a free plan.

[Create an account](https://fly.io/app/sign-in). Although you are required to enter payment details, everything we do here will work on the free tier and you won't be charged.

Next, [install the `flyctl`](https://fly.io/docs/flyctl/installing/) utility. Run `flyctl auth login` to sign into your account.

Copy `fly.template.toml` to `fly.toml`. Open `fly.toml` and customize the app name on the first line of the file.

Now, run `flyctl launch` from `actual-server`. You should have a running app now!

Whenever you want to update Actual, update the versions of `@actual-app/api` and `@actual-app/web` in `package.json` and run `flyctl  deploy`.

**Note:** if you don't want to use fly, we still provide a `Dockerfile` to build the app so it should work anywhere that can compile a docker image.

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

_You can also configure the data dir with the `ACTUAL_USER_FILES` environment variable._

## Configuring the server URL

The Actual app is totally separate from the server. In this project, they happen to both be served by the same server, but the app doesn't know where the server lives.

The server could live on a completely different domain. You might setup Actual so that the app and server are running in completely separate places.

Since Actual doesn't know what server to use, the first thing it does is asks you for the server URL. If you are running this project, simply click "Use this domain" and it will automatically fill it in with the current domain. This works because we are serving the app and server in the same place.
