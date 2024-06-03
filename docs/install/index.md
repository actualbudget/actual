# Installing Actual

The Actual Budget project is made up of two parts: the client and the server.  A server is not required for Actual to function but it is strongly recommended as it provides increased functionality. Below is a table of features of Actual and if those features work with just a client or if a server is needed. 

| Feature | Without Server | Needs Server |
|:-|:-:|:-:|
| Import transactions from files | X | |
| All budgeting features (budgets, reports, schedules, etc) | X | |
| Import or Export budget files | X | |
| Use Actual on a mobile device | | X[^1] |
| Use Actual in a web browser | | X[^1] |
| Sync budget between devices| | X |
| Use bank syncing (GoCardless or SimpleFIN)| | X |
| Use the Actual API | | X |

The standard way of using Actual is to set up a personal server and use a web browser for the application.  For quick testing or getting to know Actual before setting up a server, the [demo](https://demo.actualbudget.org) or a [desktop application](https://github.com/actualbudget/actual/releases) are a good place to start.

## Server-Optional Client Options

Desktop applications are available for Windows, Mac, and Linux. These can be [downloaded from GitHub](https://github.com/actualbudget/actual/releases).  The desktop apps have the following benefits:
* Can connect to a server (this gives them the ability to use the server-based features)
* Automated backups
* Offline use is ready out of the box 

## Server-Based Client Options

The server provides a web-based version of Actual.  This web app can be used in a browser as a standard web page to view and edit your budget.  The web page can also be installed on your device.  For mobile devices, an installed web page will work offline.

## Running a Server

While running a server can be a complicated endeavour, we’ve tried to make it fairly easy to set up and hands-off to maintain. Choose one of the following options to get started:

- If you’re not comfortable with the command line and are willing to pay a small amount of money to have your version of Actual hosted on the cloud for you, we recommend [PikaPods](pikapods.md).[^2]
- If you’re willing to run a few commands in the terminal:
  - [Fly.io](fly.md) offers free cloud hosting.
  - You could [directly install Actual locally](local.md) on macOS, Windows, or Linux if you don’t want to use a tool like Docker. (This method is the best option if you want to contribute to Actual's development!)
  - If you want to use Docker, we have instructions for [using our provided Docker containers](docker.md).

Once you’ve set up your server, you can [configure it](../config/index.md) to change a few of the ways it works.

If you're coming from the original, managed Actual subscription service, you may want to [migrate your data](../migration/index.md).

## Additional Installation Options

In addition to our officially supported options listed above, some community members have written guides for using other platforms or tools:

:::caution

Content contained on external links is not managed or maintained by the Actual Budget team, if you run into issues with instructions on a third party site, please contact the author in the first instance or ask in discord where a member of the community may be able to help.

:::

- [Synology NAS](https://mariushosting.com/how-to-install-actual-on-your-synology-nas/)
- [Home Assistant](https://github.com/sztupy/hassio-actualbudget/blob/main/README.md)

[^1]: You technically don't need a server instance for this. You need to run either a web-based client or a server, but a server is the same effort.
[^2]: A portion of the cost to host on PikaPods is donated to the Actual Budget Project.  With that said, PikaPods is a very simple, and cost-effective way, to host your server.
