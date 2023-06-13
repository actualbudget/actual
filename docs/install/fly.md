---
title: 'Fly.io'
---

In order to deploy Actual to Fly.io, you’ll need to use their command line interface from a terminal program. If you’ve never used a terminal before, don’t worry! We’ll walk you through every step of the process.

## Setup

### Creating a Fly.io Account

First, you’ll need to sign up for an account. Go to [fly.io](https://fly.io) and click “Get Started,” then fill in the form. Note that Fly may require you to enter credit card details. See [their docs on how they use credit cards](https://fly.io/docs/about/credit-cards/) for more information. If you follow the steps in this guide, you will remain well within the free plan limits. For more details, check out [Fly’s pricing documentation](https://fly.io/docs/about/pricing/).

### Accessing the `fly` command line tool

There are two ways to access the `fly` command line tool. You can either install it on your local machine, or you can use the web-based terminal that Fly provides. We recommend using the web-based terminal, as it’s the easiest way to get started. However, if you run into issues with the web-based terminal, you can always install the `fly` command line tool on your local machine.

#### Web-based terminal

Go to https://fly.io/terminal/ and click “Launch Web CLI” at the bottom of the page. You may be asked to log into Fly.

Create a new folder named `actual` by typing in this command once the `/app/bin $` prompt appears. Once you’ve typed in the command, press the `Enter` key on your keyboard.

```
mkdir actual; cd actual
```

Your terminal should look like this if you’ve done everything correctly:

```
/app/bin $ mkdir actual; cd actual
/app/bin/actual $
```

#### Local installation

If you prefer to install the `fly` command line tool on your local machine, you’ll need to start by opening a command line terminal on your computer.

- **Windows**: Open the Start menu and search for “PowerShell.” Click on the “PowerShell” app to open it.
- **macOS**: Open the “Terminal” app from the Utilities folder in your Applications folder.
- **Linux**: Open your terminal app of choice.

Next, follow [the instructions to install the `fly` command line tool](https://fly.io/docs/hands-on/install-flyctl/). When entering the commands, make sure _not_ to include the `$` character at the beginning of each line.

<details><summary>Detailed instructions with screenshots for Windows</summary>

Note: the exact commands you’ll need to run may have changed, check the website linked above to make sure you have the latest ones.

1. Open up PowerShell on your local machine and paste the following command into the window:
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```
   ![](/img/fly/windows-install-1.png)
2. Flyctl should start installing

   ![](/img/fly/windows-install-2.png)

3. Once done you should get a message saying `Run flyctl --help to get started`:

   ![](/img/fly/windows-install-3.png)

</details>

<details><summary>Detailed instructions with screenshots for macOS</summary>

Note: the exact commands you’ll need to run may have changed, check the website linked above to make sure you have the latest ones.

Additionally, you might get an error such as `command not found: fly` when you try to use the `fly` command later. If that happens, you’ll need to change the `fly` part of the command to `~/.fly/bin/fly` instead.

1. In the Finder, choose “Go → Utilities” from the menu bar.

   ![](/img/fly/macos-install-1@2x.png)

2. Scroll down in the list until you find “Terminal.” Double-click on it to open it.

   ![](/img/fly/macos-install-2@2x.png)

3. A window should pop up that will look a bit like this. Note that some of the text may be different, or you may see the last line ending with a `$` instead of a `%`. Both of those are normal.

   ![](/img/fly/macos-install-3@2x.png)

4. Type or paste the following command to start the install. Make sure you press the `Enter` key on your keyboard after you’ve typed it in.

   ```bash
    curl -L https://fly.io/install.sh | sh
   ```

   ![](/img/fly/macos-install-4@2x.png)

5. Once that has finished, you should see something like this:

   ![](/img/fly/macos-install-5@2x.png)

</details>

### Logging into Fly.io

Type `fly auth login` and press enter to open your browser and log your terminal into Fly.io.

## Configuring the app

Now that you’ve gotten the CLI set up, you’re ready to deploy your app to Fly.io. First, you’ll need our template Fly configuration:

### Web-based terminal

1. Type in (or copy-paste) the command `cat > fly.toml` and press enter. Your cursor should move to a new blank line.
2. Copy the contents of the `fly.toml` template file below and paste it into the terminal.
3. Hit return on your keyboard so your cursor is at the beginning of a new line.
4. Press control+d on your keyboard to save the file. (Use the “control” key even on macOS! Terminals are weird)

<details><summary>Click to expand <code>fly.toml</code> template</summary>

```toml title=fly.toml
[env]
  PORT = "5006"
  TINI_SUBREAPER = "1"

[experimental]
  auto_rollback = true
  cmd = ["node", "--max-old-space-size=180", "app.js"]

[mounts]
  source="actual_data"
  destination="/data"

[[services]]
  http_checks = []
  internal_port = 5006
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "10s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

</details>

### Local terminal

1. Create a new folder somewhere on your computer. You can call it whatever you want.
2. <a rel="download" target="_top" href="/fly.toml">Download the template <code>fly.toml</code> file by clicking here</a> and move it into the folder you just created.
3. Switch back to your terminal and navigate to the folder you just created.
   - On macOS, drag the folder from Finder to Terminal and hold the command key when dropping it into the terminal window.
   - On Windows, type `cd`, followed by a space, and then enter the full path (e.g. starting with `C:\`) to the folder you created. You can find the path in Explorer.
   - On Linux, use the `cd` command.

## Deploying the app

Now that you’ve got the configuration file set up, you’re ready to deploy your app to Fly.io. To do so, run the following commands. Wait for each command to finish before running the next one.

First, tell Fly about Actual:

```bash
fly launch --image actualbudget/actual-server:latest
```

This command will ask a series of questions:

- “_An existing fly.toml file was found. Would you like to copy its configuration to the new app?_” Type `y` and press enter to use the config file we’ve provided.
- “_Choose an app name (leave blank to generate one)_” Your app will be available online at <code>https://<em>the-name-you-choose</em>.fly.dev</code>. You can choose any name you want, but it must be unique. If you’re not sure what to choose, you can leave it blank and Fly will generate a random name for you. Either type the name and press enter, or just press enter.
- _Choose a region for deployment_ This is the physical location where the server will be set up. You can choose any region you want, but we recommend choosing the one closest to you. Use the up and down arrow keys to pick a region, then press enter to choose the highlighted option.
- _Would you like to set up a Postgresql database now?_ Type `n` and press enter to skip this step.
- _Would you like to set up an Upstash Redis database now?_ Type `n` and press enter to skip this step.
- _Would you like to deploy now?_ We’re not quite done yet! Type `n` and press enter. We’ll deploy the app once we’re done.

Next, we’ll need to set up a “volume,” a place Fly can store your data so it doesn’t get lost when you restart or upgrade the server. To do so, run the following command:

```bash
fly volumes create actual_data
```

You may receive a warning message:

- “_Warning! Individual volumes are pinned to individual hosts. You should create two or more volumes per application. You will have downtime if you only create one. Do you still want to use the volumes feature?_” Actual is only designed to work with one volume, and downtime should only happen when you are manually updating Actual in the future. Type `y` and press enter to continue.

You may be asked to pick a region. Select the same one you chose for the main server, if asked.

It may take a few seconds to create the volume. Once that’s done, you’re ready to deploy! Run this command to deploy your app:

```bash
fly deploy
```

The deploy can take a couple of minutes. Once it finishes, you’ll see a message like this:

```
No machines in group app, launching a new machine
  Machine 148ed726c17298 [app] update finished: success
Finished launching new machines
Updating existing machines in 'some-app-1234' with rolling strategy
  Finished deploying

Visit your newly deployed app at https://some-app-1234.fly.dev/
```

You can now visit your very own instance of Actual by opening the link on the last line of the output.

## Configuring Actual

Now that Actual has been launched, you should now be able to navigate to Actual using the URL
provided by the Fly command above earlier.

<details><summary>Forgot the URL? Here’s how to find it</summary>

If you forget the URL, you can always find it by opening [https://fly.io/dashboard](https://fly.io/dashboard) in a browser. Click on the application you created:

![](/img/fly/fly-dash.png)

Once you are in there, you should see Hostname section under Application Information - click the
link

![](/img/fly/fly-dash-2.png)

This will now open Actual so we can start configuring it.

</details>

1. Set a password - remember this, you will need it in the future.

   ![](/img/fly/actual-config-1@2x.png)

2. You’ll see a welcome screen. Either click “Import my budget” to [import your budget from YNAB or the subscription version of Actual](../migration/index.md), or click “Start fresh” to create a blank budget file.

   ![](/img/fly/actual-config-2@2x.png)

3. If everything went well you should then be taken to your very first budget.

   ![](/img/fly/actual-register.png)

Actual is now up and running. Congratulations! Consider checking out [our tour](../tour/index.md) next.

## Updating Actual

When updates to Actual are released, you’ll need to re-deploy your app to get the latest version.

### Web-based terminal

Go to https://fly.io/terminal/ and click “Launch Web CLI” at the bottom of the page. You may be asked to log into Fly.

Run the following command, changing the `your-app-name` part to the name you chose when you first deployed Actual:

```bash
fly deploy --image actualbudget/actual-server:latest --app your-app-name
```

For example, if your copy of Actual was available at `https://spring-firefly-8368.fly.dev/`, you would run:

```bash
fly deploy --image actualbudget/actual-server:latest --app spring-firefly-8368
```

### Local terminal

Open a terminal window and navigate to the folder where you set up Actual. Run the following command:

```bash
fly deploy
```

## Frequent Issues

- **Q.** _I have deployed actual to Fly.io but I am being charged, why is this?_

  **A.** While we wouldn’t know for certain without seeing your configuration, it is likely that during
  deployment you created a Postgres database. Actual doesn’t need this so you can just delete it and
  charges should then stop. If you're unsure, please [reach out to us](/contact).

- **Q.** _How can I try out a beta/unstable version of Actual?_

  **A.** We publish unstable releases of Actual every day. These versions may have known or unknown issues that could corrupt your budget. If you’d like to try them out, follow the [instructions to update](#updating-actual) above, but change `actualbudget/actual-server:latest` to `actualbudget/actual-server:edge`.
