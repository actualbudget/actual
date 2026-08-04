# CLAUDE.md — packages/desktop-client/e2e/

Playwright E2E tests for the desktop/web client. Scoped guidance for working in this
directory specifically — see the root `CLAUDE.md`/`AGENTS.md` for repo-wide conventions.

## Page-model contract

- Every UI interaction goes through a `page-models/*.ts` class (`BudgetPage`,
  `AccountPage`, `Navigation`, ...) — no raw `page.locator(...)` chains inside `*.test.ts`
  files. If a page model doesn't have the method you need, add one; keep additions
  additive (don't change an existing method's signature — other tests depend on it).
- Locators are role/testid-based (`getByRole`, `getByTestId`), never CSS or XPath
  selectors — those break silently on markup changes that don't affect behavior.
- Prefer the existing React-quirk helpers in `page-models/navigation.ts`
  (`clickReactAriaButton`, `fillReactInput`) over plain `.click()`/`.fill()` when working
  with React Aria controls — they exist specifically to avoid detached-node flake.

## Assertions

- **Delta assertions, not hardcoded values.** Demo/seed data is generated fresh per test
  run (`ConfigurationPage.createTestFile()`), so read a value, act, then assert the
  _change_ — never assert a specific dollar amount exists.
- Use web-first assertions (`expect(...)`, `expect.poll(...)`) for their built-in
  auto-retry. Never `page.waitForTimeout(...)` — if something needs a wait, there's a
  condition to poll on instead.
- Import `{ expect, test }` from `./fixtures`, not directly from `@playwright/test` — the
  fixture disables CSS animations, which stops a real class of flaky click races.

## Known app behaviors worth knowing before writing new tests

- **`Spent` renders as a negative number** in the budget table (e.g. `"-158.06"`), not
  positive. Spending more makes it more negative.
- **Under Playwright, "today" is hardcoded.** `packages/loot-core/src/shared/months.ts`'s
  `currentMonth()` returns `'2017-01'` whenever `Platform.isPlaywright` is true (detected
  via `playwright.config.ts`'s `userAgent: 'playwright'`), for deterministic runs. Never
  compute "today"/"next month" from the host clock (`new Date()`) in a test — derive it
  from the app's own state instead (e.g. `BudgetPage.getSelectedMonth()`).
- **Demo-seeded accounts aren't reliable for index-0 lookups.** Accounts like "Bank of
  America" have pinned "Upcoming/Due/Missed" schedule-preview rows that always sort above
  a newly created transaction, so `getNthTransaction(0)` won't be the transaction you just
  created. Create a fresh empty account (`Navigation.createAccount`) instead when a test
  needs to reason about a specific row index.
- **Split transactions**: the amount typed on the root row _before_ clicking "Split"
  becomes the parent's fixed total; the auto-created child rows must be filled with
  amounts that sum exactly to it, or the entry won't submit.
- **The budget table is virtualized** (`AutoSizer` returns null until layout provides
  width/height) — always `await budgetPage.waitFor()` before asserting on it.

## Running tests

```bash
# Against a locally-managed dev server (default)
yarn workspace @actual-app/web e2e

# Against an already-running server (e.g. Docker), single spec, single browser
E2E_START_URL=http://localhost:3001 yarn workspace @actual-app/web playwright test \
  budget-workflow.test.ts --browser=chromium

# Flakiness check
... --repeat-each=3 --workers=1
```

Visual regression tests (`toMatchThemeScreenshots`) are a no-op outside VRT runs — don't
add them to new behavioral tests; see the repo's `running-vrts` skill if you're actually
adding VRT coverage.
