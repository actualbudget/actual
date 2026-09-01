This is the main project to run [Actual](https://github.com/actualbudget/actual), a local-first personal finance tool. It comes with the latest version of Actual, and a server to persist changes and make data available across all devices.

### Getting Started

Actual is a local-first personal finance tool. It is 100% free and open-source, written in NodeJS, it has a synchronization element so that all your changes can move between devices without any heavy lifting.

If you are interested in contributing, or want to know how development works, see our [contributing](https://actualbudget.org/docs/contributing/) document we would love to have you.

Want to say thanks? Click the ⭐ at the top of the page.

### Using the CLI tool

Node.js v22 or higher is required for the @actual-app/sync-server npm package

**Install globally with npm:**

```bash
npm install --location=global @actual-app/sync-server
```

After installing, you can execute actual-server commands directly in your terminal.

> **npm 11+: `allow-scripts` warnings during install**
>
> The install above prints warnings like:
>
> ```
> npm warn allow-scripts 2 packages have install scripts not yet covered by allowScripts:
> npm warn allow-scripts   bcrypt@6.0.0 (install: node-gyp-build)
> npm warn allow-scripts   better-sqlite3@12.11.1 (install: prebuild-install || node-gyp rebuild --release)
> ```
>
> These are expected. `bcrypt` and `better-sqlite3` are native modules, and their install
> scripts must run for the server to work.
>
> The `npm approve-scripts` command that the warning suggests cannot record an approval
> for a global install, because there is no project `package.json` for it to write to
> (see [npm/cli#9457](https://github.com/npm/cli/issues/9457)). Approve them through your
> npm config instead:
>
> ```ini
> ; ~/.npmrc
> allow-scripts = bcrypt, better-sqlite3
> ```
>
> or per-install:
>
> ```bash
> npm install --location=global @actual-app/sync-server --allow-scripts=bcrypt,better-sqlite3
> ```
>
> From npm v12, dependency install scripts are opt-in by default. Without one of the
> above, the native modules will not build and the server will fail to start.

**Usage**

```bash
actual-server [options]
```

**Available options**

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `-h` or `--help`    | Print this list and exit.    |
| `-v` or `--version` | Print this version and exit. |
| `--config`          | Path to the config file.     |
| `--reset-password`  | Reset your password          |

**Examples**

Run with default configuration

```bash
actual-server
```

Run with custom configuration

```bash
actual-server --config ./config.json
```

Reset your password

```bash
actual-server --reset-password
```

### Documentation

We have a wide range of documentation on how to use Actual. This is all available in our [Community Documentation](https://actualbudget.org/docs/), including topics on [installing](https://actualbudget.org/docs/install/), [Budgeting](https://actualbudget.org/docs/budgeting/), [Account Management](https://actualbudget.org/docs/accounts/), [Tips & Tricks](https://actualbudget.org/docs/getting-started/tips-tricks) and some documentation for developers.

### Feature Requests

Current feature requests can be seen [here](https://github.com/actualbudget/actual/issues?q=is%3Aissue+label%3A%22needs+votes%22+sort%3Areactions-%2B1-desc). Vote for your favorite requests by reacting 👍 to the top comment of the request.

To add new feature requests, open a new Issue of the "Feature Request" type.
