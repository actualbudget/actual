# Installing Actual

The Actual Budget project is made up of two parts: the client and the server. A server is not required for Actual to function but it is strongly recommended as it provides increased functionality. Below is a table of features of Actual and if those features work with just a client or if a server is needed.

| Feature                                                   | Without Server | Needs Server |
| :-------------------------------------------------------- | :------------: | :----------: |
| Import transactions from files                            |       X        |              |
| All budgeting features (budgets, reports, schedules, etc) |       X        |              |
| Import or Export budget files                             |       X        |              |
| Use Actual on a mobile device                             |                |    X[^1]     |
| Use Actual in a web browser                               |                |    X[^1]     |
| Sync budget between devices                               |                |      X       |
| Use bank syncing (GoCardless or SimpleFIN)                |                |      X       |
| Use the Actual API                                        |                |      X       |

The standard way of using Actual is to set up a personal server and use a web browser for the application. For quick testing or getting to know Actual before setting up a server, the [demo](https://demo.actualbudget.org) or a [desktop application](https://github.com/actualbudget/actual/releases) are a good place to start.

## Using Actual locally in the browser

If you are okay with not having sync, auto-save, or backups then the easiest and fastest way to get started is by using the Actual [web app](https://app.actualbudget.org). This solution requires less setup but more maintenance.

All data is saved to your local browser. The Actual web app never has access to any of your personal data. It is recommended that you save your data (from the [settings](/docs/backup-restore/backup) menu) after every session. If your browser memory is cleared, your data will be lost, so a backup is crucial.

Using a new device or browser requires you to [restore](/docs/backup-restore/restore) the saved file for each new device or browser. Remember that these new devices and browsers will not sync without a server set up, so anything you modify on one browser will not appear on others.

:::caution

This solution is not recommended for long-term use due to the maintenance required and the high probability of data loss. It's intended as a quick start. If you'd like to continue using Actual long-term, please use one of the server options [below](#running-a-server).

:::

## Server-Optional Client Options

Desktop applications are available for Windows, Mac, and Linux. These can be [downloaded from GitHub](https://github.com/actualbudget/actual/releases). The desktop apps have the following benefits:

- Can connect to a server (this gives them the ability to use the server-based features)
- Automated backups
- Offline use is ready out of the box

## Server-Based Client Options

The server provides a web-based version of Actual. This web app can be used in a browser as a standard web page to view and edit your budget. The web page can also be installed on your device. For mobile devices, an installed web page will work offline.

## Running a Server

While running a server can be a complicated endeavor, we've tried to make it fairly easy to set up and hands-off to maintain. Choose one of the following options to get started:

- If you're not comfortable with the command line and are willing to pay a small amount of money to have your version of Actual hosted on the cloud for you, we recommend [PikaPods](pikapods.md).[^2]
- If you're willing to run a few commands in the terminal:
  - You can run the server with a simple command using the [CLI tool](cli-tool.md)
  - [Fly.io](fly.md) also offers cloud hosting for a similar amount of money.
  - If you want to use Docker, we have instructions for [using our provided Docker containers](docker.md).
  - You could [build Actual from source](build-from-source.md) on macOS, Windows, or Linux if you don't want to use a tool like Docker. (This method is the best option if you want to contribute to Actual's development!)

Once you've set up your server, you can [configure it](../config/index.md) to change a few of the ways it works.

If you're coming from the original, managed Actual subscription service, you may want to [migrate your data](../migration/index.md).

## Additional Installation Options

In addition to our officially supported options listed above, some community members have written guides for using other platforms or tools:

:::caution

Content contained on external links is not managed or maintained by the Actual Budget team, if you run into issues with instructions on a third party site, please contact the author in the first instance or ask in discord where a member of the community may be able to help.

:::

- [Google Cloud always free tier](https://github.com/eatonc/actual-gcp)
- [Google Cloud Run (serverless)](https://github.com/daniefdz/actual-run)
- [Home Assistant](https://github.com/sztupy/hassio-actualbudget/blob/main/README.md)
- [Proxmox VE Helper-Scripts](https://community-scripts.github.io/ProxmoxVE/scripts?id=actualbudget)
- Synology NAS
  - [Marius Bogdan Lixandru's guide](https://mariushosting.com/how-to-install-actual-on-your-synology-nas/)
  - [Adam Millerchip's guide](https://adamu.jp/blog/actual_budget_nas)
- [UnRAID SSL Setup](https://discord.com/channels/937901803608096828/1158941114603155477) - this guide is found at our Discord
- Arch Linux AUR packages:
  - [actual-appimage](https://aur.archlinux.org/packages/actual-appimage) - Desktop App, based on GitHub AppImage release.
  - [actual-bin](https://aur.archlinux.org/packages/actual-bin) - Desktop App, based on GitHub AppImage release but run with a system-wide electron install (v30) instead of the bundled version.
  - [actual-server](https://aur.archlinux.org/packages/actual-server) - Server and Web Client, based on `@actual-app/sync-server` NPM package, provides a systemd unit file to run the server.

[^1]: You technically don't need a server instance for this. You need to run either a web-based client or a server, but a server is the same effort.

[^2]: A portion of the cost to host on PikaPods is donated to the Actual Budget Project. With that said, PikaPods is a very simple, and cost-effective way to host your server.
