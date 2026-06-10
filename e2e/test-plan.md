# Test Plan: Account → Transaction → Balance

## Overview

This test plan covers the core financial workflow of Actual Budget:
creating an account, recording transactions against it, and verifying
that the displayed balance accurately reflects those transactions.

---

## Scope

| In scope                                     | Out of scope                        |
| -------------------------------------------- | ----------------------------------- |
| Local (no-server) account creation           | Sync server / multi-device sync     |
| On-budget and off-budget accounts            | Bank import / CSV import            |
| Manual debit and credit transactions         | Scheduled transactions              |
| Account balance accuracy after transactions  | Budget envelope tracking            |
| Transaction cancellation (no balance change) | Rules / payee matching              |
| Parallel-safe test data isolation            | Mobile-specific UI (separate suite) |

---

## Test Environment

| Attribute   | Value                                            |
| ----------- | ------------------------------------------------ |
| App URL     | `http://localhost:3001` (or `E2E_BASE_URL`)      |
| Browser     | Chromium (Desktop Chrome device profile)         |
| Budget mode | Demo budget (loaded from "View demo" at startup) |
| Test runner | Playwright 1.49+                                 |
| Parallelism | Fully parallel across workers                    |

---

## Setup & Teardown

**Global setup (`tests/app.setup.ts`)**

- Navigates to the app and completes the server-selection screen once.
- Saves `storageState` to `.auth/app-session.json`.
- Every subsequent test inherits this state, skipping the server screen.

**Per-test setup (via `page` fixture in `fixtures/test-fixtures.ts`)**

- Navigates to the app.
- If the budget-selection screen is shown, clicks "View demo" to load a
  pre-populated demo budget.
- Returns once on the `/budget` or `/accounts` page.

**Per-test teardown (`afterEach` in spec file)**

- Closes the account created during the test to prevent sidebar clutter
  across tests in the same browser context.

---

## Test Scenarios

### TC-01 · Debit transaction reduces balance

**Priority:** Critical  
**Steps:**

1. Generate a unique account with `initialBalance = 500`.
2. Create the account via the sidebar "Add account" flow.
3. Navigate to the account page.
4. Assert initial balance equals `$500.00`.
5. Add a debit transaction for `$75.00`.
6. Wait for the transaction row to appear.
7. Assert balance equals `$425.00`.

**Expected:** Balance decreases by the debit amount.

---

### TC-02 · Credit transaction increases balance

**Priority:** Critical  
**Steps:**

1. Generate a unique account with `initialBalance = 200`.
2. Create the account and navigate to it.
3. Add a credit transaction for `$150.00`.
4. Assert balance equals `$350.00`.

**Expected:** Balance increases by the credit amount.

---

### TC-03 · Multiple transactions accumulate correctly

**Priority:** High  
**Steps:**

1. Generate a unique account with `initialBalance = 1000`.
2. Create the account and navigate to it.
3. Add three transactions:
   - Debit `$200.00`
   - Credit `$50.00`
   - Debit `$100.00`
4. Assert all 4 rows visible (1 initial-balance + 3 added).
5. Assert final balance equals `$750.00`.

**Expected:** Each transaction correctly adjusts the running balance.

---

### TC-04 · Off-budget account balance

**Priority:** Medium  
**Steps:**

1. Generate a unique account with `initialBalance = 3000`, marked off-budget.
2. Create the account using the "Off budget" toggle in the creation modal.
3. Navigate to the account and add a debit for `$500.00`.
4. Assert balance equals `$2500.00`.

**Expected:** Off-budget accounts track balances independently from the budget envelope.

---

### TC-05 · Cancelled transaction leaves balance unchanged

**Priority:** Medium  
**Steps:**

1. Generate a unique account with `initialBalance = 300`.
2. Navigate to the account.
3. Click "Add New", fill in a transaction for `$999.00`, then click "Cancel".
4. Assert only 1 transaction row is present (initial-balance row).
5. Assert balance is still `$300.00`.

**Expected:** Cancelling a form does not persist any transaction or alter the balance.

---

## Risk & Edge Cases

| Risk                               | Mitigation                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Demo budget data varies by version | Tests generate their own accounts; they do not rely on demo data being present.               |
| OPFS not persisted across contexts | Each test calls `navigateToBudget()` via the fixture, which re-loads the demo if needed.      |
| Floating-point balance comparison  | Use `roundMoney()` and `moneyEquals()` from `utils/money-utils.ts` in all balance assertions. |
| Parallel account-name collision    | `Date.now()` suffix on every generated name.                                                  |
| Balance text format changes        | `parseMoney()` handles `$`, `-`, parenthetical negatives, and comma separators.               |
| Slow CI startup                    | `webServer` timeout is 120 s; `navigationTimeout` is 30 s; 1 retry on CI.                     |

---

## Metrics

| Metric                              | Target  |
| ----------------------------------- | ------- |
| Test suite duration (local)         | < 2 min |
| Test suite duration (CI, 4 workers) | < 45 s  |
| Flake rate (over 20 runs)           | < 2 %   |
| Coverage of critical balance path   | 100 %   |
