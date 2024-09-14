# Local Installation

The easiest way to get Actual running locally is to use [actual-server](https://github.com/actualbudget/actual-server). 

Actual server is used for syncing changes across devices. It comes with the latest version of the [Actual web client](https://github.com/actualbudget/actual).

## Prerequisites

- The Actual server requires Node.js v18 or greater. You can download and install the latest version of Node.js from [Node.js website](https://nodejs.org/en/download) (we recommend downloading the “LTS” version). 
- Consider using a tool like [nvm](https://github.com/nvm-sh/nvm) or [asdf](https://asdf-vm.com) to install and manage multiple versions of Node.js.
- You’ll also need to have Git installed. The Git website has [instructions for downloading and working with Git for all supported operating systems](https://git-scm.com/download).
- Actual uses yarn packages. You can install [yarn](https://yarnpkg.com/getting-started/install) using the following command:

  ```bash
  npm install --global yarn
  ```

## Installing Actual

1. After the prerequisites are fulfilled, clone the [Actual server](https://github.com/actualbudget/actual-server) project in your project root directory where you want to install Actual.
  ```bash
  git clone https://github.com/actualbudget/actual-server.git
  ```

2. Navigate to the Actual Server in your project root director.
    ```bash
    cd actual-server
    ```
3. Install all the required dependencies using yarn.
    ```bash
    yarn install
    ```

## Running Actual

After the Actual server is installed, start the Actual server by running the following command:
```bash
yarn start
```
Note that if you restart your computer, you’ll have to run this command again to start the server.

## Accessing Actual

After the server has been started, you can access Actual using your browser at [http://localhost:5006](http://localhost:5006). 

When accessing Actual for the first time, you may be prompted to provide a URL for the server. For a local installation, click the **Use localhost:5006** button to use the server you've [configured](https://actualbudget.org/docs/config/).

## Updating Actual

1. Stop the server if it’s running. You can use the keyboard shortcut <kbd>CTRL-C</kbd> (even on macOS) to stop the server or close the terminal window it’s running from.
2. Run `git pull` from the directory you cloned the project into. This will download the latest server code.
3. Run `yarn install` from that same directory. This will download the latest web client code, along with any updated dependencies for the server.
4. Restart the server by running `yarn start`.

Actual is constantly evolving to include new features and improve the user's experience. It is always recommended that your local installation be updated with our [latest releases](https://actualbudget.org/docs/releases).
