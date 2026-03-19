---
title: 'CLI'
---

# CLI Tool

:::danger Experimental — API may change
The CLI is **experimental** and its commands, options, and behavior are **likely to change** in future releases. Use it for scripting and automation with the understanding that updates may require changes to your workflows.
:::

The `@actual-app/cli` package provides a command-line interface for interacting with your Actual Budget data. It connects to your sync server and lets you query and modify budgets, accounts, transactions, categories, payees, rules, schedules, and more — all from the terminal.

:::note
This is different from the [Server CLI](../install/cli-tool.md) (`@actual-app/sync-server`), which is used to host and manage the Actual server itself.
:::

## Installation

Node.js v22 or higher is required.

```bash
npm install --save @actual-app/cli
```

Or install globally:

```bash
npm install --location=global @actual-app/cli
```

## Configuration

The CLI requires a connection to a running Actual sync server. Configuration can be provided via environment variables, CLI flags, or a config file.

### Environment Variables

| Variable               | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `ACTUAL_SERVER_URL`    | URL of the Actual sync server (required)            |
| `ACTUAL_SYNC_ID`       | Budget Sync ID (required for most commands)         |
| `ACTUAL_PASSWORD`      | Server password (one of password or token required) |
| `ACTUAL_SESSION_TOKEN` | Session token (alternative to password)             |

### CLI Flags

Global flags override environment variables:

| Flag                      | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `--server-url <url>`      | Server URL                                      |
| `--password <pw>`         | Server password                                 |
| `--session-token <token>` | Session token                                   |
| `--sync-id <id>`          | Budget Sync ID                                  |
| `--data-dir <path>`       | Local data directory for cached budget data     |
| `--format <format>`       | Output format: `json` (default), `table`, `csv` |
| `--verbose`               | Show informational messages on stderr           |

### Config File

The CLI uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for configuration. You can create a config file in any of these formats:

- `.actualrc` (JSON or YAML)
- `.actualrc.json`, `.actualrc.yaml`, `.actualrc.yml`
- `actual.config.json`, `actual.config.yaml`, `actual.config.yml`
- An `"actual"` key in your `package.json`

Example `.actualrc.json`:

```json
{
  "serverUrl": "http://localhost:5006",
  "password": "your-password",
  "syncId": "1cfdbb80-6274-49bf-b0c2-737235a4c81f"
}
```

:::caution Security
Avoid storing plaintext passwords in config files (including the `password` key above). Prefer environment variables such as `ACTUAL_PASSWORD` or `ACTUAL_SESSION_TOKEN`, or use a session token in config instead of a password.
:::

## Usage

```bash
actual <command> <subcommand> [options]
```

## Commands

### Accounts

```bash
# List all accounts
actual accounts list

# Create an account
actual accounts create --name "Checking" [--offbudget] [--balance 50000]

# Update an account
actual accounts update <id> [--name "New Name"] [--offbudget true]

# Close an account (with optional transfer)
actual accounts close <id> [--transfer-account <id>] [--transfer-category <id>]

# Reopen a closed account
actual accounts reopen <id>

# Delete an account
actual accounts delete <id>

# Get account balance
actual accounts balance <id> [--cutoff 2026-01-31]
```

### Budgets

```bash
# List available budgets on the server
actual budgets list

# Download a budget by sync ID
actual budgets download <syncId> [--encryption-password <pw>]

# Sync the current budget
actual budgets sync

# List budget months
actual budgets months

# View a specific month
actual budgets month 2026-03

# Set a budget amount (in integer cents)
actual budgets set-amount --month 2026-03 --category <id> --amount 50000

# Set carryover flag
actual budgets set-carryover --month 2026-03 --category <id> --flag true

# Hold funds for next month
actual budgets hold-next-month --month 2026-03 --amount 10000

# Reset held funds
actual budgets reset-hold --month 2026-03
```

### Categories

```bash
# List all categories
actual categories list

# Create a category
actual categories create --name "Groceries" --group-id <id> [--is-income]

# Update a category
actual categories update <id> [--name "Food"] [--hidden true]

# Delete a category (with optional transfer)
actual categories delete <id> [--transfer-to <id>]
```

### Category Groups

```bash
# List all category groups
actual category-groups list

# Create a category group
actual category-groups create --name "Essentials" [--is-income]

# Update a category group
actual category-groups update <id> [--name "New Name"] [--hidden true]

# Delete a category group (with optional transfer)
actual category-groups delete <id> [--transfer-to <id>]
```

### Transactions

```bash
# List transactions for an account within a date range
actual transactions list --account <id> --start 2026-01-01 --end 2026-03-31

# Add transactions (inline JSON)
actual transactions add --account <id> --data '[{"date":"2026-03-13","amount":-5000,"payee_name":"Store"}]'

# Add transactions (from file)
actual transactions add --account <id> --file transactions.json

# Import transactions with reconciliation (deduplication)
actual transactions import --account <id> --data '[...]' [--dry-run]

# Update a transaction
actual transactions update <id> --data '{"notes":"Updated note"}'

# Delete a transaction
actual transactions delete <id>
```

### Payees

```bash
# List all payees
actual payees list

# List common payees
actual payees common

# Create a payee
actual payees create --name "Grocery Store"

# Update a payee
actual payees update <id> --name "New Name"

# Delete a payee
actual payees delete <id>

# Merge multiple payees into one
actual payees merge --target <id> --ids id1,id2,id3
```

### Tags

```bash
# List all tags
actual tags list

# Create a tag
actual tags create --tag "vacation" [--color "#ff0000"] [--description "Vacation expenses"]

# Update a tag
actual tags update <id> [--tag "trip"] [--color "#00ff00"]

# Delete a tag
actual tags delete <id>
```

### Rules

```bash
# List all rules
actual rules list

# List rules for a specific payee
actual rules payee-rules <payeeId>

# Create a rule (inline JSON)
actual rules create --data '{"stage":"pre","conditionsOp":"and","conditions":[...],"actions":[...]}'

# Create a rule (from file)
actual rules create --file rule.json

# Update a rule
actual rules update --data '{"id":"...","stage":"pre",...}'

# Delete a rule
actual rules delete <id>
```

### Schedules

```bash
# List all schedules
actual schedules list

# Create a schedule
actual schedules create --data '{"name":"Rent","date":"1st","amount":-150000,"amountOp":"is","account":"...","payee":"..."}'

# Update a schedule
actual schedules update <id> --data '{"name":"Updated Rent"}' [--reset-next-date]

# Delete a schedule
actual schedules delete <id>
```

### Query (ActualQL)

Run queries using [ActualQL](./actual-ql/index.md):

```bash
# Run a query (inline)
actual query run --table transactions --select "date,amount,payee" --filter '{"amount":{"$lt":0}}' --limit 10

# Run a query (from file)
actual query run --file query.json
```

### Server

```bash
# Get the server version
actual server version

# Look up an entity ID by name
actual server get-id --type accounts --name "Checking"
actual server get-id --type categories --name "Groceries"

# Trigger bank sync
actual server bank-sync [--account <id>]
```

## Amount Convention

All monetary amounts are represented as **integer cents**:

| CLI Value | Dollar Amount |
| --------- | ------------- |
| `5000`    | $50.00        |
| `-12350`  | -$123.50      |
| `100`     | $1.00         |

When providing amounts, always use integer cents. For example, to budget $50, pass `5000`.

## Output Formats

The `--format` flag controls how results are displayed:

- **`json`** (default) — Machine-readable JSON output, ideal for scripting
- **`table`** — Human-readable table format
- **`csv`** — Comma-separated values for spreadsheet import

Use `--verbose` to enable informational messages on stderr for debugging or visibility into what the CLI is doing.

## Common Workflows

**View your budget for the current month:**

```bash
actual budgets month 2026-03 --format table
```

**Check an account balance:**

```bash
# Find the account ID
actual server get-id --type accounts --name "Checking"
# Get the balance
actual accounts balance <id>
```

**Export transactions to CSV:**

```bash
actual transactions list --account <id> --start 2026-01-01 --end 2026-12-31 --format csv > transactions.csv
```

**Add a transaction:**

```bash
actual transactions add --account <id> --data '[{"date":"2026-03-14","amount":-2500,"payee_name":"Coffee Shop"}]'
```

## Error Handling

- Non-zero exit codes indicate an error
- Errors are written as plain text to stderr (e.g., `Error: message`)
- Use `--verbose` to enable informational stderr messages for debugging
