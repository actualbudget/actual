# AI Prompts

This directory stores example prompts for AI-assisted generation of tests,
page objects, and fixture extensions.

---

## AI Prompt Usage

The following prompts were used with Claude Code during development of this framework.

Workflow:
1. Analyze the Actual Budget application.
2. Identify high-value E2E workflows.
3. Generate test plan.
4. Generate page objects.
5. Generate fixtures.
6. Generate Playwright tests.
7. Review TypeScript, Playwright, and ESLint best practices.
8. Fix test failures and improve reliability.

All AI-generated code was reviewed, refined, executed, and validated manually.

---


## Initial Framework Generation Prompt

Create the standalone Playwright framework under actual/e2e/ with the following standards.

Core requirements:
1. Use TypeScript.
2. Use Page Object classes.
3. Use fixtures for repetitive setup.
4. Use beforeAll, beforeEach, afterEach, and afterAll hooks where appropriate.
5. Prefer API setup/cleanup where the app exposes usable endpoints; otherwise use UI setup with clear helper methods.
6. Use storageState if login/session setup is required.
7. Use TypeScript interfaces instead of type aliases for data models.
8. Add Playwright, TypeScript, Prettier, and ESLint configuration.
9. Use kebab-case file names for TypeScript Playwright files.

Framework structure should be:

e2e/
├── tests/
│   └── account-transaction-balance.spec.ts
├── pages/
│   ├── base-page.ts
│   ├── budget-page.ts
│   ├── account-page.ts
│   └── transaction-page.ts
├── fixtures/
│   ├── test-fixtures.ts
│   └── test-data.ts
├── utils/
│   ├── api-client.ts
│   └── money-utils.ts
├── ai-prompts/
├── best-practices.md
├── test-plan.md
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
└── README.md

Main test workflow:
Create Account → Add Transaction → Verify Balance

Implementation expectations:
- Tests must be independent and safe for parallel execution.
- Test data must use unique names/timestamps.
- Avoid hard-coded waits.
- Prefer accessible locators and data-testid selectors where available.
- Add meaningful assertions after each major step.
- Clean up created data after each test where possible.
- Keep page objects focused on user actions, not assertions.
- Keep assertions inside spec files.
- Add a best-practices.md file explaining framework standards for page objects, fixtures, hooks, test data, cleanup, parallel execution, TypeScript style, and locator strategy.

Do not modify packages/desktop-client/e2e.
All work must stay under actual/e2e/.

---


## Generating a new page object

```
Context:
- Framework: Playwright + TypeScript, page-object pattern
- Base class: pages/base-page.ts (extends BasePage, exposes getByTestId / getByRole helpers)
- Convention: locators as `get` properties; actions as async methods; no expect() calls
- File naming: kebab-case

Task:
Create a page object for the Actual Budget "Schedules" page at /schedules.
The page lists recurring transactions. Required actions:
  - Navigate to /schedules
  - Click "Add new schedule"
  - Fill in: payee, amount, frequency (weekly/monthly), next date
  - Save the schedule
  - Return a locator for a specific schedule row by name
```

---

## Generating a new test scenario

```
Context:
- Test file: tests/account-transaction-balance.spec.ts (existing, do not modify)
- New file target: tests/schedules.spec.ts
- Imports: use `../fixtures/test-fixtures` for `test` and `expect`
- Test data: use generators from `../fixtures/test-data`
- Page objects available: BudgetPage, AccountPage, TransactionPage (and any new ones you create)
- Standards: see best-practices.md

Task:
Write a Playwright test that:
  1. Creates a monthly schedule for "Netflix" at $15.00
  2. Verifies the schedule appears in the schedules list
  3. Posts the schedule once (simulate the due date passing)
  4. Navigates to the linked account and verifies the transaction was created
```

---

## Generating a fixture for shared state

```
Context:
- Fixture file: fixtures/test-fixtures.ts
- Pattern: extend `base` (imported from @playwright/test); export extended `test`
- Scope: test-scoped unless the fixture is expensive and truly shared across tests in a worker

Task:
Add a fixture called `schedulesPage` that:
  - Creates and returns a SchedulesPage instance wired to the current test's page
  - Follows the same pattern as the existing `budgetPage` fixture
```

---


## Debugging and Stabilization Prompt

```text
Fix the failing Playwright tests without redesigning the framework.

Focus only on:
- ESLint errors
- Playwright locator failures
- Timeout issues
- Async wait issues
- storageState setup issues

Do not modify application source code.
Do not modify packages/desktop-client/e2e.
Keep all changes under actual/e2e/.
Explain each fix and why it improves reliability.
```