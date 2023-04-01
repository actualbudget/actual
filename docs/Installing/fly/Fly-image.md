---
title: 'Deploying Actual with a container image'
---

# Deploying Actual on fly.io with a container image

## Deploying

[fly.io](https://fly.io) allows running the application directly and provides a free tier. You
should be comfortable with using the command line to set it up though.

1. [Install the `flyctl`](https://fly.io/docs/flyctl/installing/) utility.
1. [Create an account](https://fly.io/app/sign-in). You can also create your account by running

   ```sh
   fly auth signup
   ```

   Although you are required to enter payment details, the resources required to run Actual are
   within the free tier, and you shouldn't be charged.

1. Copy
   [`fly.template.toml`](https://github.com/actualbudget/actual-server/raw/master/fly.template.toml)
   to an empty local directory, and rename the file `fly.toml`.

   - _Optional_: Open `fly.toml` and customize the app name on the first line of the file. e.g.:
     ```toml
     app = "actual-budget"
     ```
     App names must be _globally_ unique, so there is a meaningful probability that your chosen name
     is unavailable. Later steps allow the fly.io system to generate a unique name for you.

1. <a name="mount_config" />Persisting data means the server will retain your configuration and
   budget. Without this, each deployment or restart will wipe away all the data on the server. You
   would need to intialize (also known and listed as 'bootstrapping' in the user interface) the
   instance again and re-upload your files. We want our Actual server to persist data, so we need to
   mount a volume.

   Open `fly.toml` in a text editor and add the following:

   ```toml
   [mounts]
   source="actual_data"
   destination="/data"
   ```

1. Create your app using the following command:
   ```sh
   fly launch --image actualbudget/actual-server:latest
   ```
   1. Select `Yes` when prompted to copy existing configuration.
      ```sh
      ? Would you like to copy its configuration to the new app? (y/N) y
      ```
   1. Press `enter` to accept an auto-generated app name. You may enter a name if you wish, but it
      must be globally unique across all fly apps.
      ```sh
      ? App Name (leave blank to use an auto-generated name):
      ```
   1. Select a deployment region. The closest region should be highlighted by default, so you may
      simply hit `enter` if you do not have specific needs.
      ```sh
      ? Select region:  [Use arrows to move, type to filter]
        ams (Amsterdam, Netherlands)
        ...
      ```
   1. Select `No` when prompted to create a Postgres database.
      ```sh
      ? Would you like to setup a Postgresql database now? (y/N) n
      ```
   1. Select `No` when prompted to deploy now.
      ```sh
      ? Would you like to deploy now? (y/N) n
      ```
1. Continue to the [Persisting server data](#persisting-server-data) section.

## Persisting server data

If you choose not to set up a persistent volume, each deployment or restart will wipe away all the
data on the server. You would need to intialize (also known and listed as 'bootstrapping' in the
user interface) the the instance again and upload your files. To avoid that, let's move the data
somewhere that persists. With [fly.io](https://fly.io) we can create a [volume](https://fly.io/docs/reference/volumes/).

1. In the directory containing your `fly.toml` configuration, run this command:
   ```sh
   fly volumes create actual_data
   ```
1. Select a deployment region. The closest region should be highlighted by default, so you may
   simply hit `enter` if you do not have specific needs.

   \*Fly volumes are encrypted at rest by default. See the fly.io docs if you wish to disable this,
   though we do **_not_** recommend doing so.\*

1. If you have not already added a mount to your fly config, follow [the instructions above](#mount_config)
   to do so.
1. Deploy your application:
   ```sh
   fly deploy
   ```
   ![image](https://user-images.githubusercontent.com/2792750/181817536-599fd99b-d8f1-4a80-b268-1c3da2b05a40.png)

You should have a running app now! Actual will check if the `/data`[¹](#note_1) directory exists and use it
automatically. You can open the app using

```sh
fly apps open
```

## Updating Actual

Whenever you want to update Actual, return to the directory containing your `fly.toml` file and run

```sh
fly deploy
```

If you wish to change the image source (eg to run an unstable build, or a specific tag), run

```sh
fly deploy --image [desired image tag]
```

with `[desired image tag]` replaced with your desired tag.

<a name="note_1" />¹ _You can also configure the data dir with the `ACTUAL_USER_FILES` environment
variable._

## Frequent Issues

- **Q.** _I have deployed actual to Fly.io but I am being charged, why is this?_

  **A.** While we wouldn’t know for certain without seeing your configuration, it is likely that during
  deployment you created a Postgres database. Actual doesn’t need this so you can just delete it and
  charges should then stop. If you're unsure, please [reach out to us](/Contact).

## Official Images

These images are published based on the `master` branch of the [actual-server repo][upstream].

- Docker hub: [actualbudget/actual-server](https://hub.docker.com/r/actualbudget/actual-server)
- Github Container Registry: [ghcr.io/actualbudget/actual-server](https://ghcr.io/actualbudget/actual-server)
