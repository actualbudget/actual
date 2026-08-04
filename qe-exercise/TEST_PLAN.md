# Test Plan: Budgeting + Transactions E2E Tests

## Scope

**Budgeting + Transactions**, chosen because they interlock — a transaction changes a
category's Spent, which changes its balance — so tests here can exercise real
cross-feature user journeys instead of isolated clicks. Actual already has a mature
Playwright suite (`packages/desktop-client/e2e/`) with mostly single-action, snapshot-heavy
coverage; the gap is verifying that money actually moves correctly between a transaction,
an account balance, and a budget category.

## Out of scope

| Area                                | Reason                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Mobile (`.mobile.test.ts` variants) | Doubles the test matrix without adding new logic coverage — same underlying behavior as desktop. |
| Bank sync                           | Requires external credentials not available in this environment.                                 |
| Reports                             | Read-only derived data; lower risk than the write paths covered here.                            |

## How the case list was chosen

Started from a broader candidate list and cut down to what's worth automating. Some
examples of what got cut:

| Candidate                 | Decision | Reason                                                            |
| ------------------------- | -------- | ----------------------------------------------------------------- |
| Sidebar collapse/expand   | Cut      | Already covered by existing snapshot tests; near-zero defect odds |
| Category rename           | Cut      | CRUD on a label, no cross-feature state involved                  |
| Budget month navigation   | Cut      | Exercised incidentally by the rollover test (B4)                  |
| Transfer between accounts | Kept     | See P0 reasoning below                                            |

Every kept case is tagged P0/P1/P2 by blast radius and detectability:

- **T5 (transfers) — P0.** Mirrored double-entry is a classic ledger defect — a broken
  mirror silently moves money across two accounts with no visible error.
- **B3 (overspend + cover) — P0.** Envelope budgeting's core promise is that overspending
  stays visible and recoverable; breaks user trust even without data loss.
- **B2 (transaction → category Spent) — P0.** The single cross-feature seam the whole
  scope choice rests on.
- **T6 (payee filter) — P2.** A wrong filter result is immediately visible and
  non-destructive.

Three cases (B6, T7, T8) started as open questions about undefined behavior. Rather than
guess, I resolved them by exercising the running app directly (via a throwaway Playwright
script against the Docker-hosted instance) and reading the relevant source where the UI
alone was ambiguous. Findings below.

## Data strategy

Data comes from the **"Try the demo"** flow (`ConfigurationPage.createTestFile()`,
`page-models/configuration-page.ts:19`), which seeds accounts, categories, and
transactions and waits for the budget table to mount. Because this seed data is generated
fresh each run, every test reads a value, acts, then asserts the _change_ — never a
hardcoded dollar amount.

## Robustness principles

- **Assert on deltas, never on demo values** — read, act, assert the change (existing
  `budget.test.ts:41`'s `getBalanceForRow` pattern already does this).
- **Page models only** — role/testid locators, no CSS/XPath in test files.
- **Web-first assertions** (`expect`, `expect.poll`), never `waitForTimeout`.
- **No visual snapshots** in the new tests — `toMatchThemeScreenshots` is a no-op outside
  VRT runs; skipping it keeps diffs focused on behavior.
- **Fresh budget file per test**, safe under `fullyParallel: true`.
- Import `{ expect, test }` from `./fixtures`, not `@playwright/test` — the fixture
  disables CSS animations to avoid flaky click races.

## Test cases

### `budget-workflow.test.ts`

| #   | Priority | Test                                       | Preconditions                                        | Expected result                                                                                                                                                                                                                                                                                                                                        |
| --- | -------- | ------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | P1       | Budget an amount to a category             | Demo file loaded                                     | Category balance and Budgeted total both increase by the same delta                                                                                                                                                                                                                                                                                    |
| B2  | P0       | Create a transaction in a category         | Demo file loaded                                     | Category Spent increases and balance decreases by the transaction amount                                                                                                                                                                                                                                                                               |
| B3  | P0       | Overspend then cover from another category | Category budgeted less than a transaction against it | Overspent category surfaces in the Overspent summary; covering it from another category zeroes the overspend and reduces the source balance by the same amount                                                                                                                                                                                         |
| B4  | P1       | Category balance rolls over to next month  | Category has a positive leftover balance             | Next month's starting balance for that category equals this month's leftover                                                                                                                                                                                                                                                                           |
| B5  | P1       | Transaction dated in the next month        | Demo file loaded                                     | Hits next month's Spent, not the current month's (current month's Spent is unaffected). _Side finding: entering a future-dated transaction triggers a "Convert to schedule?" prompt on save, which must be dismissed ("keep as transaction") — not specific to this test case, so it's handled generically in `addEnteredTransaction`._                |
| B6  | P2       | Budget a negative or non-numeric amount    | Demo file loaded                                     | **Negative** ("-50") is accepted verbatim, category balance goes negative by that amount. **Non-numeric** ("abc") or **empty** input is coerced to 0.00, not rejected and not reverted to the prior value. _(Confirmed by direct observation — no input validation exists for this field.)_                                                            |
| B7  | P1       | Overspent category at the month boundary   | Category balance driven negative by a transaction    | The negative balance does **not** carry forward: next month's balance for that category is 0, not the overspend. The counterpart to B4's positive rollover. _(Confirmed from `envelope.ts` — `leftover-${cat.id}` adds the previous month's `leftover-pos` (clamped at 0) unless `carryover` is set, and `carryover` is `createStatic`'d to `false`.)_ |
| B8  | P0       | Transaction in an off-budget account       | An off-budget account exists                         | Category Spent and balance are unchanged, and the on-budget sidebar total is unchanged; only that account's own balance moves. _(Confirmed from `base.ts` — each category's `sum-amount` query filters on `AND a.offbudget = 0`.)_                                                                                                                     |
| B9  | P0       | Transfer a balance between categories      | Source category has a positive balance               | Source is emptied to 0 **and** destination gains exactly that amount. _Gap closed: `budget.test.ts`'s existing transfer test asserts only the destination, so a transfer that credits without debiting would pass it._                                                                                                                                 |
| B10 | P1       | Drill down from a category's Spent         | Category has ≥1 transaction                          | The transaction list opened is scoped to that category — every row shown carries it. _Gap closed: `budget.test.ts`'s existing drill-down test asserts only the URL and page title, not which transactions are listed._                                                                                                                                 |

### `transaction-lifecycle.test.ts`

| #   | Priority | Test                                                | Preconditions                            | Expected result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------- | --------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | P1       | Create a transaction                                | Any account                              | Row shows correct payee/category/amount; account balance drops by that amount                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| T2  | P1       | Edit a transaction's amount                         | Existing transaction                     | Both the row's running balance and the account balance update to reflect the new amount                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| T3  | P1       | Delete a transaction                                | Existing transaction                     | Row disappears; account balance returns to its pre-transaction value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| T4  | P1       | Split a transaction                                 | Any account                              | Split children sum to the parent amount; parent row shows "Split"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| T5  | P0       | Transfer between two on-budget accounts             | Two on-budget accounts                   | Mirrored entries created on both sides; combined on-budget balance is unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| T6  | P2       | Filter transactions by payee                        | Account with multiple payees             | Only matching rows shown; clearing the filter restores the full list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| T7  | P2       | Create a $0 transaction                             | Any account                              | Transaction **is created** (not rejected) and appears in the ledger with debit/credit 0.00; account balance is unaffected. _(Confirmed by direct observation.)_                                                                                                                                                                                                                                                                                                                                                                                                   |
| T8  | P1       | Delete a category with transactions against it      | Category has ≥1 transaction              | Deletion is **blocked** until a transfer-target category is chosen (`ConfirmCategoryDeleteModal`); on confirming with a target, transactions are reassigned to it — never orphaned or silently deleted. _(Confirmed from `budget/mutations.ts` — `useDeleteCategoryMutation` calls `must-category-transfer` and, if true, requires `transferCategory` before `category-delete` runs.)_                                                                                                                                                                            |
| T9  | P0       | Transfer from an on-budget to an off-budget account | One on-budget and one off-budget account | Mirrored entries on both sides; the **on-budget total changes** (money left the budget) while the **all-accounts total is unchanged** (it only moved sides). The complement to T5, where the on-budget total must _not_ move. The category cell reads **"Categorize"** on the on-budget side and **"Off budget"** on the other — _not_ "Transfer", which is reserved for transfers where both sides are on budget. _(Corrected after the first run failed asserting "Transfer"; confirmed in `TransactionsTable.tsx`'s `isBudgetTransfer`/`isOffBudget` branch.)_ |
| T10 | P1       | Recategorize an existing transaction                | Transaction in a known category          | The old category's Spent returns to its prior value and the new category's Spent moves by the full amount — the amount is moved, not copied into both.                                                                                                                                                                                                                                                                                                                                                                                                            |
| T11 | P0       | Delete a transaction (budget side)                  | Transaction in a known category          | The category's Spent returns to its pre-transaction value. Complements T3, which asserts only the account balance — a delete that left Spent behind would pass T3 while permanently distorting the budget.                                                                                                                                                                                                                                                                                                                                                        |
| T12 | P1       | Split across two categories (budget side)           | Any account                              | Each child's amount lands in its own category's Spent — not all on one category, and not double-counted via the parent. Complements T4, which asserts only the row structure and account balance.                                                                                                                                                                                                                                                                                                                                                                 |

## Verification (see `SETUP.md` for exact commands)

1. New tests pass against the Docker-hosted app.
2. Not flaky: `--repeat-each=3` and `--workers=1` reruns.
3. Mutation check on B2 and T5: temporarily break the underlying balance/Spent logic,
   confirm the test fails, then restore — proves the test actually checks something.
4. Full existing Playwright suite still passes (nothing upstream broke).
5. `yarn typecheck` and `yarn lint` clean.
