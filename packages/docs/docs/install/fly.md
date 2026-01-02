---
title: 'Fly.io'
---

In order to deploy Actual to Fly.io, you'll need to use their command line interface from a terminal program. If you've never used a terminal before, don't worry! We'll walk you through every step of the process.

## Setup

### Creating a Fly.io Account

Fly.io has a "pay as you go" plan for new users with no monthly fee, with actual usage billed monthly. Paid plans start at $5/month and include a limited amount of free compute. See [Pricing Details](https://fly.io/docs/about/pricing/) for more information.

To begin, you'll need to sign up for an account. Go to [Fly.io](https://fly.io) and click "Get Started," then fill in
the form. Note that Fly requires you to provide credit card details for sign up. See [their docs on how they use credit cards](https://fly.io/docs/about/credit-cards/) for more information.

### Accessing the `fly` command line tool

To install the `fly` command line tool on your local machine, you'll need to start by opening a command line terminal on your computer.

- **Windows**: Open the Start menu and search for "PowerShell." Click on the "PowerShell" app to open it.
- **macOS**: Open the "Terminal" app from the Utilities folder in your Applications folder.
- **Linux**: Open your terminal app of choice.

Next, follow [the instructions to install the `fly` command line tool](https://fly.io/docs/hands-on/install-flyctl/). When entering the commands, make sure _not_ to include the `$` character at the beginning of each line.

<details>
<summary>Detailed instructions with screenshots for Windows</summary>

Note: the exact commands you'll need to run may have changed, check the website linked above to make sure you have the latest ones.

1. Open up PowerShell on your local machine and paste the following command into the window:
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```
   ![](/img/fly/windows-install-1.webp)
2. Flyctl should start installing

   ![](/img/fly/windows-install-2.webp)

3. Once done you should get a message saying `Run flyctl --help to get started`:

   ![](/img/fly/windows-install-3.webp)

</details>

<details>
<summary>Detailed instructions with screenshots for macOS</summary>

Note: the exact commands you'll need to run may have changed, check the website linked above to make sure you have the latest ones.

Additionally, you might get an error such as `command not found: fly` when you try to use the `fly` command later. If that happens, you'll need to change the `fly` part of the command to `~/.fly/bin/fly` instead.

1. In the Finder, choose "Go → Utilities" from the menu bar.

   ![](/img/fly/macos-install-1@2x.webp)

2. Scroll down in the list until you find "Terminal." Double-click on it to open it.

   ![](/img/fly/macos-install-2@2x.webp)

3. A window should pop up that will look a bit like this. Note that some of the text may be different, or you may see the last line ending with a `$` instead of a `%`. Both of those are normal.

   ![](/img/fly/macos-install-3@2x.webp)

4. Type or paste the following command to start the install. Make sure you press the `Enter` key on your keyboard after you've typed it in.

   ```bash
    curl -L https://fly.io/install.sh | sh
   ```

   ![](/img/fly/macos-install-4@2x.webp)

5. Once that has finished, you should see something like this:

   ![](/img/fly/macos-install-5@2x.webp)

</details>

### Logging into Fly.io

Type `fly auth login` and press enter to open your browser and log your terminal into Fly.io.

## Configuring the app

Now that you've gotten the CLI set up, you're ready to deploy your app to Fly.io. First, you'll need our template Fly configuration:

### Local terminal

1. Create a new folder somewhere on your computer. You can call it whatever you want.
2. <a rel="download" target="_top" href="/fly.toml">Download the template <code>fly.toml</code> file by clicking here</a> and move it into the folder you just created.
3. Switch back to your terminal and navigate to the folder you just created.
   - On macOS, drag the folder from Finder to Terminal and hold the command key when dropping it into the terminal window.
   - On Windows, type `cd`, followed by a space, and then enter the full path (e.g. starting with `C:\`) to the folder you created. You can find the path in Explorer.
   - On Linux, use the `cd` command.

## Deploying the app

Now that you've got the configuration file set up, you're ready to deploy your app to Fly.io. To do so, run the following commands. Wait for each command to finish before running the next one.

First, tell Fly about Actual:

```bash
fly launch --image actualbudget/actual-server:latest
```

This command will ask a series of questions:

1. "_An existing fly.toml file was found. Would you like to copy its configuration to the new app? y/N_" Type `y` and press enter to use the config file we've provided.
2. "_Do you want to tweak these settings before proceeding? y/N_" If you choose `y`, the web configuration UI will open in your browser.

You can now visit your very own instance of Actual by opening the link on the last line of the output.

## Configuring Actual

Now that Actual has been launched, you should be able to navigate to Actual using the URL
provided by the Fly command above earlier.

<details>
<summary>Forgot the URL? Here's how to find it</summary>

If you forget the URL, you can always find it by opening [https://fly.io/dashboard](https://fly.io/dashboard) in a browser. Click on the application you created:

![](/img/fly/fly-dash.webp)

Once you are in there, you should see Hostname section under Application Information - click the
link

![](/img/fly/fly-dash-2.webp)

This will now open Actual so we can start configuring it.

</details>

1. Set a password - remember this, you will need it in the future.

   ![](/img/fly/actual-config-1@2x.webp)

2. You'll see a welcome screen. Either click "Import my budget" to [import your budget from YNAB or the subscription version of Actual](../migration/index.md), or click "Start fresh" to create a blank budget file.

   ![](/img/fly/actual-config-2@2x.webp)

3. If everything went well you should then be taken to your very first budget.

   ![](/img/fly/actual-register.webp)

Actual is now up and running. Congratulations! Consider checking out [our tour](../tour/index.md) next.

## Updating Actual

When updates to Actual are released, you'll need to re-deploy your app to get the latest version.

```
fly deploy --image actualbudget/actual-server:latest --app your-app-name
```

### Local terminal

Open a terminal window and navigate to the folder where you set up Actual. Run the following command:

```bash
fly deploy
```

## Cost Optimizations

If you're looking to lower your monthly compute costs for Actual Budget and can accept a 5-15 second delay when starting your budgeting session, you can add this feature to your services section and re-deploy.

```toml
[[services]]
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0
```

With these settings, Fly.io will automatically stop your instance after a few minutes of inactivity. When a new request comes in, the instance will start up again, which may take 5-15 seconds.

## Frequent Issues

- **Q.** _I have deployed actual to Fly.io but I am being charged, why is this?_

  **A.** Pay as you go plans are billed for all usage monthly.

- **Q.** _How can I try out a beta/unstable version of Actual?_

  **A.** We publish unstable releases of Actual every day. These versions may have known or unknown issues that could corrupt your budget. If you'd like to try them out, follow the [instructions to update](#updating-actual) above, but change `actualbudget/actual-server:latest` to `actualbudget/actual-server:edge`.
