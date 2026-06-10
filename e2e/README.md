# Actual Budget — Standalone E2E Framework

Playwright + TypeScript E2E test suite for [Actual Budget](https://actualbudget.org).
Lives at `actual/e2e/` and is fully independent from the main monorepo's
`packages/desktop-client/e2e/` suite.

---

## Prerequisites

- Node.js >= 20
- The Actual Budget dev server running at `http://localhost:3001`
  (start it from the repo root with `docker compose up -d`)

---

## Quick start

```bash
# 1. Install dependencies
cd actual/e2e
npm install          # or: yarn / pnpm install

# 2. Install Playwright browsers
npm run install:browsers

# 3. Start the app (from the repo root, in a separate terminal)
docker compose up -d

# 4. Run tests
npm test
```

### Other commands

| Command               | Description                       |
| --------------------- | --------------------------------- |
| `npm test`            | Run all tests headlessly          |
| `npm run test:headed` | Run with a visible browser window |
| `npm run test:debug`  | Open Playwright Inspector         |
| `npm run test:ui`     | Open Playwright UI mode           |
| `npm run report`      | Open the last HTML report         |
| `npm run typecheck`   | Type-check without running tests  |
| `npm run lint`        | Lint TypeScript sources           |
| `npm run format`      | Auto-format with Prettier         |

---

## Environment variables

| Variable              | Default                 | Purpose                                       |
| --------------------- | ----------------------- | --------------------------------------------- |
| `E2E_BASE_URL`        | `http://localhost:3001` | App URL                                       |
| `E2E_START_SERVER`    | _(unset)_               | Set to `1` to auto-start the dev server       |
| `E2E_SYNC_SERVER_URL` | _(unset)_               | Sync server URL for `ApiClient` health checks |

---

## Project structure

```
e2e/
├── tests/
│   ├── app.setup.ts                     # storageState setup (runs once, saves server selection)
│   └── account-transaction-balance.spec.ts  # Core workflow tests
├── pages/
│   ├── base-page.ts                     # Root page object with shared helpers
│   ├── budget-page.ts                   # /budget route + sidebar account creation
│   ├── account-page.ts                  # /accounts/:id — balance, transaction list
│   └── transaction-page.ts             # Inline transaction entry form
├── fixtures/
│   ├── test-fixtures.ts                 # Extended `test` with page-object fixtures
│   └── test-data.ts                     # Interfaces + factory functions
├── utils/
│   ├── api-client.ts                    # HTTP client for app/server health checks
│   └── money-utils.ts                   # parseMoney, formatMoney, roundMoney
├── ai-prompts/
│   └── README.md                        # Example prompts for AI-assisted test generation
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
├── best-practices.md
└── test-plan.md
```

---

## How it works

### Session setup (storageState)

`tests/app.setup.ts` runs as a separate Playwright project before the main
tests. It navigates to the app, completes the one-time server-selection screen
("Don't use a server"), and saves the browser's `localStorage` / `sessionStorage`
to `.auth/app-session.json`. Every subsequent test starts with this state applied,
so the server-selection step is never repeated.

> **Note:** Actual Budget stores its budget database in the browser's Origin
> Private File System (OPFS), which is NOT captured by `storageState`. Each
> test therefore still needs to select a budget. This is handled automatically
> by the `page` fixture override in `fixtures/test-fixtures.ts`, which detects
> the budget-selection screen and clicks "View demo".

### Page Object Model

```
BasePage
├── BudgetPage   — /budget, sidebar, account creation
├── AccountPage  — /accounts/:id, balance, transaction list
└── TransactionPage  — inline transaction entry form
```

Rules: page objects encapsulate **user actions only** — no `expect()` calls.
Assertions live exclusively in spec files.

### Test fixtures

Importing from `fixtures/test-fixtures.ts` gives you:

- **`page`** — standard Playwright page, pre-navigated through app setup
- **`budgetPage`** — `BudgetPage` instance
- **`accountPage`** — `AccountPage` instance
- **`transactionPage`** — `TransactionPage` instance
- **`apiClient`** — `ApiClient` instance for HTTP health checks

### Test data

All test data is generated with `Date.now()` timestamps so parallel workers
never collide on the same account name. Use the factories from
`fixtures/test-data.ts` and never hard-code entity names in tests.

---

## Adding a test

1. Create `tests/my-feature.spec.ts`.
2. Import `test` and `expect` from `../fixtures/test-fixtures`.
3. Use page objects for interactions; put all `expect()` calls in the spec.
4. Add any missing page-object methods to the appropriate class under `pages/`.
5. Run `npm run typecheck && npm run lint` before committing.

See [best-practices.md](./best-practices.md) for detailed conventions.
