# @actual-app/cli

> **WARNING:** This CLI is experimental.

Command-line interface for [Actual Budget](https://actualbudget.org). Query and modify your budget data from the terminal — accounts, transactions, categories, payees, rules, schedules, and more.

> **Note:** This CLI connects to a running [Actual sync server](https://actualbudget.org/docs/install/). It does not operate on local budget files directly.

## Installation

```bash
npm install -g @actual-app/cli
```

Requires Node.js >= 22.

## Quick Start

```bash
# Set connection details
export ACTUAL_SERVER_URL=http://localhost:5006
export ACTUAL_PASSWORD=your-password
export ACTUAL_SYNC_ID=your-sync-id   # Found in Settings → Advanced → Sync ID

# List your accounts
actual accounts list

# Check a balance
actual accounts balance <account-id>

# View this month's budget
actual budgets month 2026-03
```

## Configuration

Configuration is resolved in this order (highest priority first):

1. **CLI flags** (`--server-url`, `--password`, etc.)
2. **Environment variables**
3. **Config file** (via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig))
4. **Defaults** (`dataDir` defaults to `~/.actual-cli/data`)

### Environment Variables

| Variable               | Description                                   |
| ---------------------- | --------------------------------------------- |
| `ACTUAL_SERVER_URL`    | URL of the Actual sync server (required)      |
| `ACTUAL_PASSWORD`      | Server password (required unless using token) |
| `ACTUAL_SESSION_TOKEN` | Session token (alternative to password)       |
| `ACTUAL_SYNC_ID`       | Budget Sync ID (required for most commands)   |
| `ACTUAL_DATA_DIR`      | Local directory for cached budget data        |

### Config File

Create an `.actualrc.json` (or `.actualrc`, `.actualrc.yaml`, `actual.config.js`):

```json
{
  "serverUrl": "http://localhost:5006",
  "password": "your-password",
  "syncId": "1cfdbb80-6274-49bf-b0c2-737235a4c81f"
}
```

**Security:** Do not store plaintext passwords in config files (e.g. `.actualrc.json`, `.actualrc`, `.actualrc.yaml`, `actual.config.js`). Add these files to `.gitignore` if they contain secrets. Prefer the `ACTUAL_SESSION_TOKEN` environment variable instead of the `password` field. See [Environment Variables](#environment-variables) for using a session token.

### Global Flags

| Flag                      | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `--server-url <url>`      | Server URL                                      |
| `--password <pw>`         | Server password                                 |
| `--session-token <token>` | Session token                                   |
| `--sync-id <id>`          | Budget Sync ID                                  |
| `--data-dir <path>`       | Data directory                                  |
| `--format <format>`       | Output format: `json` (default), `table`, `csv` |
| `--verbose`               | Show informational messages                     |

## Commands

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `accounts`        | Manage accounts                |
| `budgets`         | Manage budgets and allocations |
| `categories`      | Manage categories              |
| `category-groups` | Manage category groups         |
| `transactions`    | Manage transactions            |
| `payees`          | Manage payees                  |
| `tags`            | Manage tags                    |
| `rules`           | Manage transaction rules       |
| `schedules`       | Manage scheduled transactions  |
| `query`           | Run an ActualQL query          |
| `server`          | Server utilities and lookups   |

Run `actual <command> --help` for subcommands and options.

### Examples

```bash
# List all accounts (as a table)
actual accounts list --format table

# Find an entity ID by name
actual server get-id --type accounts --name "Checking"

# Add a transaction (amount in integer cents: -2500 = -$25.00)
actual transactions add --account <id> \
  --data '[{"date":"2026-03-14","amount":-2500,"payee_name":"Coffee Shop"}]'

# Export transactions to CSV
actual transactions list --account <id> \
  --start 2026-01-01 --end 2026-12-31 --format csv > transactions.csv

# Set budget amount ($500 = 50000 cents)
actual budgets set-amount --month 2026-03 --category <id> --amount 50000

# Run an ActualQL query
actual query run --table transactions \
  --select "date,amount,payee" --filter '{"amount":{"$lt":0}}' --limit 10
```

### Amount Convention

All monetary amounts are **integer cents**:

| CLI Value | Dollar Amount |
| --------- | ------------- |
| `5000`    | $50.00        |
| `-12350`  | -$123.50      |

## Running Locally (Development)

If you're working on the CLI within the monorepo:

```bash
# 1. Build the CLI
yarn build:cli

# 2. Start a local sync server (in a separate terminal)
yarn start:server-dev

# 3. Open http://localhost:5006 in your browser, create a budget,
#    then find the Sync ID in Settings → Advanced → Sync ID

# 4. Run the CLI directly from the build output
ACTUAL_SERVER_URL=http://localhost:5006 \
ACTUAL_PASSWORD=your-password \
ACTUAL_SYNC_ID=your-sync-id \
node packages/cli/dist/cli.js accounts list

# Or use a shorthand alias for convenience
alias actual-dev="node $(pwd)/packages/cli/dist/cli.js"
actual-dev budgets list
```
