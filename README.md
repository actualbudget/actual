
This is the main project to run [Actual](XXX), a local-first personal finance tool. It comes with the latest version of Actual, and a server to persist changes and make data available across all devices.

## Running

It's very easy to get started. Clone this repo, install deps, and start it:

```
git clone https://github.com/actualbudget/actual-server.git
cd actual-server
yarn install
yarn start
```

Go to https://localhost:5006 in your browser and you'll see Actual.

## Deploying

You should deploy your server so it's always running. We recommend [fly.io](https://fly.io) which makes it incredibly easy and provides a free plan.

[Create an account](https://fly.io/app/sign-in). Once you see the credit card page, you don't actually have to enter it. Just navigate to https://fly.io/apps to see the dashboard.

Next, [install the `flyctl`](https://fly.io/docs/flyctl/installing/) utility. Run `flyctl auth login` to sign into your account.

Now, run `flyctl launch` from `actual-server`. You should have a running app now!

Whenever you want to update Actual, update the versions of `@actual-app/api` and `@actual-app/web` in `package.json` and run `flyctl  deploy`.

**Note:** if you don't want to use fly, we still provide a `Dockerfile` to build the app so it should work anywhere that can compile a docker image.

### Non-technical users

We are looking into a feature for one-button click click deployment of Actual. This will reduce the friction for people not as comfortable with the command line.