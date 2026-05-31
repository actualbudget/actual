# Test Plan: Envelope Budgeting & Transaction Management

## 1. Overview

**Application:** Actual Budget — a local-first personal finance tool built on the envelope budgeting methodology.

**Selected Features:**

- **Feature 1 — Envelope Budgeting:** The core value proposition of Actual. Users allocate income into virtual "envelopes" (categories), track spending against them, and move money between envelopes to stay on budget.
- **Feature 2 — Transaction Management:** The mechanism that drives envelope balances. Users create, edit, search, and delete transactions; all of which feed back into the budget.

These two features were chosen because they are tightly coupled: every transaction reduces a category balance, and every budget allocation decision is only meaningful if transactions are accurately recorded. Testing them together validates the system, not just individual screens.

---

## 2. Scope

### In Scope

- Budget summary calculations (Available funds, Overspent, Budgeted, For next month, To Budget)
- Category and allocation management (create category, set/change/zero-out budget amounts)
- Fund transfers between envelope categories
- Month navigation and per-month budget state
- Transaction CRUD (create basic, split, and transfer transactions)
- Transaction search and filtering
- Cross-feature data integrity: spending transactions reduce the correct category balance

### Out of Scope

- Budget goal templates (separate automation feature)
- Bank sync / external provider integration
- Mobile views
- Multi-user sync conflicts

---

## 3. Test Environment

| Item           | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| Application    | Actual Budget (local instance)                                       |
| URL            | `http://localhost:3001`                                              |
| Browser        | Chromium (Playwright)                                                |
| Test framework | Playwright with TypeScript                                           |
| Test data      | Demo budget file created via `createTestFile()` fixture              |
| Isolation      | Each test creates a fresh budget file; no shared state between tests |

---

## 4. Test Cases

### Feature 1: Envelope Budgeting

#### TC-B01 — Budget summary displays all required financial fields

**Priority:** High | **Type:** Smoke

**Steps:**

1. Load the budget page for the current month.
2. Locate the budget summary card.

**Expected result:** Summary shows Available funds, Overspent (previous month), Budgeted, For next month, and To Budget — all with numeric values.

**Implemented by:** `Budget › renders the summary information: available funds, overspent, budgeted and for next month`

---

#### TC-B02 — Create a new budget category inside an existing group

**Priority:** High | **Type:** Functional

**Steps:**

1. Navigate to the budget page.
2. Hover over the "Usual Expenses" group row to expose the Add category button.
3. Trigger the Add category action.
4. Type "Test Category" into the inline input and confirm with Enter.

**Expected result:** "Test Category" appears as a new row inside "Usual Expenses". The total row count in the table increases by 1.

**Implemented by:** `Budget › creates a new budget category inside an existing group`

**Implementation note:** The "Add category" button uses a CSS `display:none → display:flex` on `:hover` pattern (React Aria component). Playwright requires hovering the 5th DOM ancestor to trigger the CSS transition, then using `el.evaluate((el: HTMLElement) => el.click())` to fire the React Aria `onPress` handler — a real-world complexity that required DOM inspection to solve.

---

#### TC-B03 — Allocating funds to a category updates the table total

**Priority:** High | **Type:** Functional

**Steps:**

1. Read the current budget text for category row 1 and the table-level total budgeted.
2. Click the budget cell for that row, fill it with $300.
3. Confirm with Enter.

**Expected result:** The table-level total budgeted changes by exactly `$300 − original row amount`. The spent total is unchanged (no transaction was added).

**Implemented by:** `Budget › verifies total budgeted updates when a category allocation changes`

---

#### TC-B04 — Transferring all balance from one category to another

**Priority:** High | **Type:** Functional

**Steps:**

1. Note balances for category rows 1 and 2.
2. Use the "Transfer to another category" flow from row 1's balance button.
3. Select row 2 as the destination and confirm.

**Expected result:** Row 2's balance equals the sum of both original balances. Balance for row 1 is 0. Table-level totals are unchanged (money moved internally, not added).

**Implemented by:** `Budget › transfer funds to another category` and `Budget › verifies balance calculation after fund transfer`

---

#### TC-B05 — Zero-out a category allocation returns funds to the budget pool

**Priority:** Medium | **Type:** Functional

**Steps:**

1. Set category row 1 to $500 and record the table total.
2. Set the same cell back to $0.

**Expected result:** The table-level total budgeted decreases by exactly $500 (50,000 cents).

**Implemented by:** `Budget › verifies zero-out allocation returns funds to budget`

---

#### TC-B06 — Budget allocation persists after a full page reload

**Priority:** High | **Type:** Data Integrity

**Steps:**

1. Set category row 1 to $450. Record the resulting balance.
2. Hard-reload the page (`waitUntil: 'networkidle'`).
3. Read the balance for the same row.

**Expected result:** The balance is identical before and after reload. Actual Budget stores data locally in SQLite; this test verifies that writes are committed before the UI reports success.

**Implemented by:** `Budget › verifies budget allocation persists after page reload`

---

#### TC-B07 — Escape key cancels a budget edit without saving

**Priority:** Medium | **Type:** UX / Negative

**Steps:**

1. Record the balance for row 1.
2. Click the budget cell, type 999999, then press Escape.

**Expected result:** The balance is unchanged. Pressing Escape must not commit the value — this validates that the app does not auto-save mid-edit.

**Implemented by:** `Budget › verifies escape key cancels budget edit without saving`

---

#### TC-B08 — Clicking the spent amount navigates to the account transactions page

**Priority:** Medium | **Type:** Navigation

**Steps:**

1. Click the spent-amount cell for category row 1.

**Expected result:** Browser navigates to `/accounts`. The account page header shows "All Accounts".

**Implemented by:** `Budget › clicking on spent amounts opens a transaction page`

---

#### TC-B09 — Month navigation updates the budget summary content

**Priority:** Medium | **Type:** Functional

**Steps:**

1. Capture the current summary text.
2. Click "Previous month" (navigates via `title="Previous month"` attribute).
3. Capture the summary text again.
4. Click "Next month" twice.
5. Capture the summary text a third time.

**Expected result:** Each navigation step changes the summary content (different month name and financial totals). The three captured texts are all distinct.

**Implemented by:** `Budget › navigates between months and updates the budget summary`

---

#### TC-B10 — Spending transaction reduces the correct envelope balance (cross-feature)

**Priority:** High | **Type:** Integration / Data Integrity

**Steps:**

1. Allocate $300 to the first category (e.g. "Food"). Record the balance.
2. Navigate to Ally Savings account.
3. Create a $100 debit transaction categorised as "Food".
4. Navigate back to the Budget page.
5. Read the "Food" row balance again.

**Expected result:** The balance decreased by exactly $100 (10,000 cents). This end-to-end test verifies the envelope accounting identity across the Transactions and Budget features.

**Implemented by:** `Budget › budget spending transaction reduces the category balance`

---

### Feature 2: Transaction Management

#### TC-T01 — Create a basic debit transaction

**Priority:** High | **Type:** Functional (Create)

**Steps:**

1. Navigate to Ally Savings. Click Add New.
2. Fill in payee "Home Depot", notes "Notes field", category "Food", debit $12.34.
3. Confirm.

**Expected result:** Transaction appears at the top of the list with all fields matching input. Credit column is empty.

**Implemented by:** `Transactions › creates a test transaction`

---

#### TC-T02 — Create a split transaction across multiple categories

**Priority:** High | **Type:** Functional (Create)

**Steps:**

1. Add a $333.33 debit with category "Split".
2. Add two child lines: $222.22 to "General", $111.11 uncategorised.

**Expected result:** Parent row shows "Split". Two child rows appear with the correct amounts and categories.

**Implemented by:** `Transactions › creates a split test transaction`

---

#### TC-T03 — Create a transfer transaction between accounts

**Priority:** High | **Type:** Functional (Create)

**Steps:**

1. Enter payee "Bank of America" (an existing account) with debit $12.34.

**Expected result:** Category auto-fills as "Transfer". After confirming, the individual account balance changes, but the All Accounts and On Budget totals are unchanged (internal transfer — no net change to total wealth).

**Implemented by:** `Transactions › creates a transfer test transaction`

---

#### TC-T04 — Real-time search filters the transaction list

**Priority:** High | **Type:** Functional (Read)

**Steps:**

1. Wait for the transaction list to fully render. Note the total row count.
2. Type "Kroger" in the Search box.
3. Type a random non-existent string.
4. Clear the search.

**Expected result:** Searching "Kroger" narrows the list to matching rows only. Non-existent string shows "No transactions". Clearing restores the original count.

**Implemented by:** `Transactions › searches transactions and filters the list`

---

#### TC-T05 — Filter by category narrows the list to matching rows

**Priority:** Medium | **Type:** Functional (Read)

**Steps:**

1. Click Filter → Category → select "Clothing". Apply.

**Expected result:** Every visible transaction row has category "Clothing".

**Implemented by:** `Transactions › filters transactions › by category`

---

#### TC-T06 — Filter by payee narrows the list to matching rows

**Priority:** Medium | **Type:** Functional (Read)

**Steps:**

1. Click Filter → Payee → enter a payee name. Apply.

**Expected result:** Only transactions for that payee are shown.

**Implemented by:** `Transactions › filters transactions › by payee`

---

#### TC-T07 — Edit a transaction field inline without a separate save step

**Priority:** High | **Type:** Functional (Update)

**Steps:**

1. Create a transaction with notes "original note".
2. Click the notes cell. Replace the text with "updated note". Confirm with Enter.

**Expected result:** The notes cell shows "updated note". Payee and amount are unchanged. There is no explicit Save button — Actual auto-saves on blur/confirm.

**Implemented by:** `Transactions › edits a transaction notes field inline`

---

#### TC-T08 — Delete a transaction and verify the account balance reverts

**Priority:** High | **Type:** Functional (Delete)

**Steps:**

1. Record the account balance.
2. Create a $99.99 debit transaction. Confirm the balance changed.
3. Select the transaction via checkbox → select-action menu → Delete.
4. Confirm the "Are you sure?" dialog.

**Expected result:** The account balance returns to exactly its pre-creation value. The deleted transaction no longer appears in the list.

**Implemented by:** `Transactions › deletes a transaction and reverts the account balance`

---

## 5. Bug Found During Testing

A **silent data-corruption bug** was discovered in the existing page model during test implementation:

**File:** `packages/desktop-client/e2e/page-models/budget-page.ts`
**Methods:** `getTotalBudgeted()`, `getTotalSpent()`, `getTotalLeftover()`

**Root cause:** All three methods used `parseInt(text, 10)` to parse currency text. JavaScript's `parseInt` stops at the first non-numeric character — so `"3,787.86"` parsed as `3`. Any budget value ≥ $1,000 was silently truncated to its leading digit.

**Impact:** Existing tests using `getTableTotals()` were passing with garbage values (`3` instead of `378786`). No prior test had asserted on actual numeric values, so the corruption was undetected.

**Fix:** Replaced with `Math.round(parseFloat(text.replace(/,/g, '')) * 100)` — consistent with the existing correct implementation in `getBalanceForRow()`.

---

## 6. Running the Tests

### Run only the newly added tests (30 total: 8+3+8+2+3+3+3)

```bash
# Budget — 8 new tests
yarn playwright test budget.test.ts --browser=chromium --headed --reporter=list \
  --grep "verifies|navigates between months|creates a new budget category|budget spending transaction"

# Transactions — 3 new tests
yarn playwright test transactions.test.ts --browser=chromium --headed --reporter=list \
  --grep "searches transactions|edits a transaction notes|deletes a transaction"

# Payees — 8 new tests
yarn playwright test payees.test.ts --browser=chromium --headed --reporter=list \
  --grep "case-insensitive search|empty state when no payees|special-character|opens the rule dialog|expected sample payees|functional search box|create rule action|selecting multiple payees"

# Bank Sync — 2 new tests
yarn playwright test bank-sync.test.ts --browser=chromium --headed --reporter=list \
  --grep "disabled state when no server|accounts available to link"

# Rules — 3 new tests
yarn playwright test rules.test.ts --browser=chromium --headed --reporter=list \
  --grep "search filters rules|rule count increases|search is case-insensitive"

# Schedules — 3 new tests
yarn playwright test schedules.test.ts --browser=chromium --headed --reporter=list \
  --grep "creates a named schedule|skips a due schedule|deletes a schedule"

# Reports — 3 new tests
yarn playwright test reports.test.ts --browser=chromium --headed --reporter=list \
  --grep "navigates to Net Worth|switching between Total|selecting Line Graph"
```

### Run the full modified suite (64 tests)

```bash
yarn playwright test budget.test.ts transactions.test.ts payees.test.ts \
  bank-sync.test.ts rules.test.ts schedules.test.ts reports.test.ts \
  --browser=chromium
```

### Run primary features only (budget + transactions)

```bash
yarn playwright test budget.test.ts transactions.test.ts --browser=chromium
```

**Result at submission:** 64 tests pass, 0 fail.

---

## 7. Non-Obvious Implementation Decisions

| Decision                                                    | Reason                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use `nth(1)` not `.first()` for editable category rows      | Row index 0 is always a group header — clicking its budget cell has no effect. This was only discovered by running tests and observing the DOM.                                                                                                                  |
| Hover 5th ancestor + `el.evaluate()` for "Add category"     | The button is `display:none` (not just `opacity:0`) until a specific ancestor is hovered. Standard Playwright `click()` and `force:true` both fail. After hover, `el.evaluate((el: HTMLElement) => el.click())` fires the React Aria `onPress` handler reliably. |
| Use existing payees (Kroger, Home Depot) in tests           | Creating a new payee name triggers a "Merge unused payees?" modal that blocks the test. Using existing payees avoids this dialog.                                                                                                                                |
| Delete test clicks "Delete" twice                           | The select-action menu opens a confirmation dialog after the first "Delete" click. Both must be handled.                                                                                                                                                         |
| `fill()` instead of `Control+A` + `type()` for budget cells | `SheetCell` enters edit mode asynchronously via `onExpose`. Typing before focus settles causes incorrect values. `fill()` waits for the textbox to be interactive.                                                                                               |

---

_Document version: 2.0 | Branch: `qe-interview-fresh`_
