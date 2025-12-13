---
title: 'CLI tool'
---

## Hosting Actual with the CLI tool

The Actual sync-server is available as an NPM package. The package is designed to make running the sync-server as easy as possible and is published to the official NPM registry under [@@actual-app/sync-server](https://www.npmjs.com/package/@actual-app/sync-server).

### Installing the CLI tool

Node.js v22 or higher is required for the `@actual-app/sync-server` npm package

**Install globally with npm:**

```bash
npm install --location=global @actual-app/sync-server
```

Once installed, you can execute commands directly from your terminal using `actual-server`.

### Usage

> Before running the tool, navigate to the directory that you wish your files to be located.

Run the CLI tool with the following syntax:

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

**Default values**

If no `--config` option is set, Actual will search for a `config.json` file in the current directory. If it exists it will be used. If it doesn't exist, Actual will set a [Default Configuration](../config/index.md).

### Examples

Run with [Default Configuration](../config/index.md):

```bash
actual-server
```

Run with [JSON Configuration](../config/index.md):

```bash
actual-server --config ./custom-config.json
```

Run with [Environment Variable Configuration](../config/index.md):

```bash
ACTUAL_DATA_DIR=./custom-directory actual-server --config ./config.json
```

Reset your password

```bash
actual-server --reset-password
```

### Updating the CLI tool

The sync server can be updated with a simple command.

```bash
npm update -g @actual-app/sync-server
```

### Uninstalling the CLI tool

The sync server can be uninstalled with a simple command.

```bash
npm uninstall -g @actual-app/sync-server
```
