# Build from source

:::info

Installing Actual by building it from source is a highly technical process. We recommend this approach primarily for contributors.

For most cases, we suggest opting for one of the simpler alternatives:

- [Pikapods](/docs/install/pikapods)
- [Desktop Client](/download)
- [CLI tool](/docs/install/cli-tool)
- [Docker](/docs/install/docker)

:::

Actual server is used for syncing changes across devices. It comes with the latest version of the [Actual web client](https://github.com/actualbudget/actual).

## Prerequisites

- The Actual server requires Node.js v22 or greater. You can download and install the latest version of Node.js from [Node.js website](https://nodejs.org/en/download) (we recommend downloading the "LTS" version).
  - If you're on Windows, during installation of Node.js, be sure to select _Automatically install the necessary tools_ from the _Tools for Native Modules_ page. This is required to build better-sqlite3. If you missed this when you installed Node.js, double-click `C:\Program Files\nodejs\install_tools.bat` from the File Explorer or run it in a terminal.
- Consider using a tool like [nvm](https://github.com/nvm-sh/nvm) or [asdf](https://asdf-vm.com) to install and manage multiple versions of Node.js.
- You'll also need to have Git installed. For Windows users, you'll also need Git Bash. The Git website has [instructions for downloading and working with Git for all supported operating systems](https://git-scm.com/download).
- Actual uses yarn packages. You can install [yarn](https://yarnpkg.com/getting-started/install) using the following command:

  ```bash
  npm install --global yarn
  ```

## Installing Actual

1. After the prerequisites are fulfilled, open bash and clone the [Actual](https://github.com/actualbudget/actual) project in your project root directory where you want to install Actual.

```bash
git clone https://github.com/actualbudget/actual.git
```

2. Navigate to the Actual in your project root directory.
   ```bash
   cd actual
   ```
3. Install all the required dependencies using yarn.
   ```bash
   yarn install
   ```
4. Build the server with
   ```bash
   yarn build:server
   ```

## Running Actual

After the Actual is installed and built, start the Actual server by running the following command:

```bash
yarn start:server
```

Note that if you restart your computer, you'll have to run this command again to start the server.

### Linux systemd Setup

On Linux systems you can configure a systemd unit file to have Actual run on system startup. This needs to be done as the root user (open a root terminal session or preface each command with sudo to run the commands below)

1. Create the file /etc/systemd/service/actual-server.service with the contents below using your text editor of choice (ex. `vi /etc/systemd/service/actual-server.service`). Note the WorkingDirectory= parameter needs to be set to your Actual install folder

```
[Unit]
Description=Actual-Server (https://actualbudget.org)
After=network.target

[Service]
WorkingDirectory=[Link to your actual-server install directory, ex. /var/www/html/actual]
ExecStart=/usr/bin/yarn start:server
Restart=on-watchdog

[Install]
WantedBy=multi-user.target
```

2. Have systemd rescan for the unit file you created -> `systemctl daemon-reload`
3. Install and start the systemd unit file -> `systemctl enable --now /etc/systemd/system/multi-user.target.wants/actual-server.service`
4. Confirm that the Actual server is running -> `systemctl status actual-server`

```
root@server:/etc/systemd/system# systemctl status actual-server
● actual-server.service - Actual-Server (https://actualbudget.org)
     Loaded: loaded (/lib/systemd/system/actual-server.service; enabled; vendor pres>
     Active: active (running) since Mon 2024-11-18 14:58:29 EST; 23h ago
   Main PID: 842857 (node)
      Tasks: 33 (limit: 38316)
     Memory: 45.9M
        CPU: 1.995s
     CGroup: /system.slice/actual-server.service
             ├─842857 node /usr/bin/yarn start:server
             ├─842870 /usr/bin/node /var/www/html/actual-server/.yarn/releases/yarn->
             └─842881 /usr/bin/node app
```

5. You should see output similar to above. The main thing to check for is the "Active: active (running)" section. From here you can consider [Setting up a Reverse Proxy](https://actualbudget.org/docs/config/reverse-proxies) and [Activating HTTPS](https://actualbudget.org/docs/config/https)
6. To stop / start / restart the server use the commands
   - `systemctl stop actual-server`
   - `systemctl start actual-server`
   - `systemctl restart actual-server`
7. To see the system log showing status or errors use the command from before. This can be helpful for troubleshooting.
   - `systemctl status actual-server`

## Accessing Actual

After the server has been started, you can access Actual using your browser at [http://localhost:5006](http://localhost:5006).

When accessing Actual for the first time, you may be prompted to provide a URL for the server. For a local installation, click the **Use localhost:5006** button to use the server you've [configured](https://actualbudget.org/docs/config/).

## Updating Actual

1. Stop the server if it's running. You can use the keyboard shortcut <kbd>CTRL-C</kbd> (even on macOS) to stop the server or close the terminal window it's running from.
2. In Bash, run `git pull` from the directory you cloned the project into. This will download the latest code.
3. Run `yarn install` from that directory. This will download any updated dependencies.
4. Run `yarn build:server` to build the server from the latest code.
5. Restart the server by running `yarn start:server`.

Actual is constantly evolving to include new features and improve the user's experience. It is always recommended that your local installation be updated with our [latest releases](https://actualbudget.org/docs/releases).

## Translations

If you would like to use Actual in a language other than English, additional setup is needed. Run the following commands in order.

1. Navigate to the Actual in your project root directory, and the `packages/desktop-client` directory inside that.
   ```bash
   cd actual  # project root
   cd packages/desktop-client
   ```
2. Clone the separate translations repository.
   ```bash
   git clone https://github.com/actualbudget/translations locale
   ```
