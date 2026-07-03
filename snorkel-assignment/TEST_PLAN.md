# E2E Test Plan — Actual Budget

**Project under test:** [actualbudget/actual](https://github.com/actualbudget/actual)
**Test framework:** Playwright (`packages/desktop-client/e2e/`)
**Scope:** Two features selected after auditing existing E2E coverage (see "How these features were chosen" below).

---

## How these features were chosen

The existing E2E suite (`budget.test.ts`, `rules.test.ts`, `accounts.test.ts`) covers
happy-path creation flows but stops short of testing the underlying _mechanics_ of
zero-based budgeting and balance verification. Two gaps stood out as both
high-value (they move real money / change financial state) and currently
untested on desktop:

1. **Envelope budget money-movement actions** — `BalanceMenu`, `CoverMenu`, and
   `ToBudgetMenu` exist in the codebase and are fully tested on **mobile**
   (`budget.mobile.test.ts`), but have **zero desktop E2E coverage**. These are
   not edge features — they are the core mechanics of envelope budgeting
   (rolling over a balance, covering overspending from another category,
   holding funds for next month).
2. **Account reconciliation** — a dedicated `Reconcile.tsx` component (with its
   own unit test, `Reconcile.test.tsx`) drives the "match my register to my
   bank statement" workflow, yet across the entire e2e suite there is only a
   single incidental assertion about reconciled transactions
   (`accounts.test.ts` — hidden-row range selection). No test exercises
   opening the reconcile menu, matching/mismatching a balance, locking
   transactions, creating an adjustment transaction, or the warning shown when
   editing/deleting an already-reconciled transaction. This is the mechanism
   users rely on to catch errors in their financial records, which makes the
   gap higher-stakes than it might first appear.

---

## Feature 1: Envelope Budget — Carryover, Cover Overspending & Hold for Next Month

### Background

In the envelope (zero-based) budget, three category/summary-level actions move
money outside the normal "budget this month" flow:

| Action                                | Trigger                                                                                                                | Component                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Rollover overspending** (carryover) | Click a category's balance cell → "Rollover overspending" / "Remove overspending rollover"                             | `BalanceMenu` (envelope)    |
| **Cover overspending**                | Click a category's balance cell (only shown when balance < 0) → "Cover overspending" → pick a source category + amount | `CoverMenu`                 |
| **Hold for next month**               | Click the "To Budget" summary amount (only shown when To Budget > 0) → "Hold for next month" → enter amount            | `ToBudgetMenu` + `HoldMenu` |

**Note on scope:** `IncomeMenu`'s "Enable/Disable auto hold" (income-category
carryover) is a related but distinct mechanism and is excluded to keep this
feature focused on the three actions named above.

### Test Environment / Setup

All tests start from the deterministic "Create test file" fixture
(`ConfigurationPage.createTestFile()`), the same fixture used by
`budget.test.ts`. Where a test needs a category with a negative balance, it
will budget a fixed amount into a category and then create a transaction that
overspends it (via `AccountPage.createSingleTransaction`).

### Test Cases

> Audit note: an earlier draft of this plan had 13 cases in this feature.
> Four (BUD-03, BUD-04, BUD-07, BUD-13) were pure menu-visibility guards that
> duplicated setup already present in the cases below, and one (BUD-08,
> arithmetic-expression input) exercised a shared utility (`evalArithmetic`)
> used across many unrelated amount fields — better suited to a unit test
> than a dedicated e2e case. Their assertions were folded into the remaining
> cases instead of dropped. BUD-11 was merged into BUD-09 since it's a direct
> continuation of the same setup, not an independent scenario.

#### 1.1 Rollover overspending (carryover)

| ID     | Title                                                                                                                       | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| BUD-01 | Enabling "Rollover overspending" on an overspent category carries the negative balance into next month instead of resetting | P0       |
| BUD-02 | Disabling carryover ("Remove overspending rollover") reverts to standard month-to-month reset behavior                      | P0       |

**BUD-01 — detailed steps:**

1. Open the budget table on a test file. Note the current month.
2. Budget `$50` into category A; create a `$80` debit transaction against category A (balance now `-$30`).
3. Click category A's balance cell → click "Rollover overspending".
4. Assert the menu item now reads "Remove overspending rollover" and a carryover indicator is visible on the balance cell (folds the former BUD-03).
5. Navigate to next month via `budgetPage.goToNextMonth()`.
6. Assert category A's starting balance for next month reflects the carried-over `-$30` (i.e., is `$30` lower than it would be without carryover).

**BUD-02 — detailed steps:** same setup as BUD-01, but after enabling carryover, click again to disable it ("Remove overspending rollover"), then go to next month and assert the `-$30` was **not** carried forward (next month starts unaffected by the prior overspend).

#### 1.2 Cover overspending

| ID     | Title                                                                                                                                                                   | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BUD-05 | Covering the full overspent amount from another category zeroes out the overspent category's balance and decreases the source category's balance by the same amount     | P0       |
| BUD-06 | Covering a partial amount (less than the full overspend) reduces — but does not eliminate — the negative balance, and decreases the source category by only that amount | P1       |

**BUD-05 — detailed steps:**

1. Budget `$50` into category A and `$100` into category B.
2. Before overspending, open category A's balance cell menu and assert "Rollover overspending" is present but "Cover overspending" is **not** (balance is still positive) — folds the former BUD-04/BUD-07 into this setup.
3. Overspend category A via a `$80` transaction (balance `-$30`).
4. Re-open the balance cell menu and assert "Cover overspending" is now present.
5. Click "Cover overspending". Confirm the amount field is pre-filled with `30.00`.
6. Type "Category B" into the "From" autocomplete and select it.
7. Submit.
8. Assert category A's balance is now `0.00` and category B's balance is now `70.00` (100 − 30).

#### 1.3 Hold for next month

| ID     | Title                                                                                                                                                                                  | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BUD-09 | Holding the full "To Budget" amount moves it entirely into "For next month", reducing "To Budget" to zero, without reducing next month's own "To Budget" total when navigating forward | P0       |
| BUD-10 | Holding a partial amount leaves the remainder available to budget this month, and only the held portion appears in "For next month"                                                    | P1       |
| BUD-12 | After holding an amount, the menu option changes to "Reset next month's buffer"; selecting it resets the buffer to zero and restores the original "To Budget" value                    | P1       |

**BUD-09 — detailed steps:**

1. Note the current "To Budget" amount (must be > 0 — true by default on the test fixture's first month).
2. Click the "To Budget" summary amount → "Hold for next month".
3. Confirm the amount field is pre-filled with the full "To Budget" value; submit as-is.
4. Assert "To Budget" is now `0.00` (or "Overbudgeted: $0.00" depending on formatting) and "For next month" shows the held amount.
5. Re-open the "To Budget" menu and assert "Hold for next month" is no longer offered (To Budget is now `0`) — folds the former BUD-13.
6. Navigate to next month and assert its "To Budget" is at least the pre-hold baseline for that month (folds the former BUD-11). Note: unbudgeted money already rolls forward month-to-month independent of an explicit hold, so holding does not _additionally_ increase next month's total on top of that baseline — it only prevents the money from being spent this month instead of reserved. The correctness guard is that holding never _loses_ money relative to next month's baseline.

---

## Feature 2: Account Reconciliation

### Background

Reconciliation is the workflow where a user enters their bank's current
balance and Actual either confirms the register matches it, or helps resolve
a mismatch. It's driven by `packages/desktop-client/src/components/accounts/Reconcile.tsx`:

| Step                   | Trigger                                                                                                                                                                                                   | Component                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Open reconcile menu    | Click the lock icon (aria-label "Reconcile") in the account header                                                                                                                                        | `ReconcileMenu`                                                          |
| Enter bank balance     | Type an amount (pre-filled with the account's current cleared balance) → "Reconcile"                                                                                                                      | `ReconcileMenu`                                                          |
| Resolve match/mismatch | A banner appears showing either "All reconciled!" or the dollar difference                                                                                                                                | `ReconcilingMessage`                                                     |
| Finish                 | "Lock transactions" (exact match) marks all cleared transactions as reconciled; "Create reconciliation transaction" (mismatch) adds an adjustment transaction; "Exit reconciliation" abandons the attempt | `Account.tsx` (`onDoneReconciling`, `onCreateReconciliationTransaction`) |
| Guard rail             | Editing or deleting an already-reconciled transaction shows a "Reconciled Transaction" warning modal before applying the change                                                                           | `ConfirmTransactionEditModal.tsx`                                        |

Only one incidental assertion about reconciled transactions exists today
(`accounts.test.ts` — hidden-row range selection); the actual reconcile flow
above has no coverage.

### Test Cases

> Audit note: RECON-02 ("Use last synced total") is deferred rather than
> written now. The "Create test file" fixture accounts are manual/offline, so
> `account.balance_current` is `null` and the button never renders — testing
> it would require a bank-sync-linked account fixture (see `bank-sync.test.ts`
> for the setup pattern), which is disproportionate cost for a P2 case. One
> new case, RECON-10, was added below after a closer read of `Account.tsx`
> surfaced a real, non-obvious, currently-untested behavior.

#### 2.1 Opening the reconcile menu

| ID       | Title                                                                                             | Priority |
| -------- | ------------------------------------------------------------------------------------------------- | -------- |
| RECON-01 | Opening the reconcile menu pre-fills the balance input with the account's current cleared balance | P1       |

#### 2.2 Matching balance (exact reconciliation)

| ID       | Title                                                                                                                                                    | Priority |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| RECON-03 | Submitting a balance equal to the cleared balance shows "All reconciled!" and a "Lock transactions" button                                               | P0       |
| RECON-04 | Clicking "Lock transactions" marks every previously-cleared, unreconciled transaction as reconciled and updates the account's "Reconciled ... ago" label | P0       |

**RECON-03/04 — detailed steps:**

1. On a test-fixture account, clear one or more transactions (or use already-cleared fixture data) and note the total cleared balance.
2. Click the "Reconcile" (lock icon) button in the account header.
3. Confirm the input is pre-filled with the cleared balance; submit as-is.
4. Assert the reconciliation banner shows "All reconciled!" and a "Lock transactions" button (no "Create reconciliation transaction" button).
5. Click "Lock transactions".
6. Assert the banner disappears, and the account header's reconcile tooltip no longer reads "Not yet reconciled" (reflects a recent timestamp instead).

#### 2.3 Mismatched balance

| ID       | Title                                                                                                                                                                                                                         | Priority |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| RECON-05 | Submitting a balance different from the cleared balance shows the exact dollar difference and offers "Create reconciliation transaction" / "Exit reconciliation" (no "Lock transactions")                                     | P0       |
| RECON-06 | Clicking "Create reconciliation transaction" adds an adjustment transaction for exactly the difference amount, with notes "Reconciliation balance adjustment", bringing the cleared balance to match the entered bank balance | P0       |
| RECON-07 | Clicking "Exit reconciliation" (without creating an adjustment) closes the banner without changing any transaction's reconciled state or the account's last-reconciled timestamp                                              | P1       |

**RECON-05/06 — detailed steps:**

1. Note the account's cleared balance (e.g. `$500.00`).
2. Open the reconcile menu, enter a different amount (e.g. `$550.00`), submit.
3. Assert the banner shows the cleared balance, the bank balance, and a difference of `+$50.00`, with "Create reconciliation transaction" and "Exit reconciliation" buttons (and no "Lock transactions" button).
4. Click "Create reconciliation transaction".
5. Assert a new transaction appears in the register for `$50.00` with notes "Reconciliation balance adjustment", and the account's cleared balance now equals `$550.00`.

#### 2.4 Guard rails on reconciled transactions

| ID       | Title                                                                                                                              | Priority |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| RECON-08 | Attempting to edit a field on a reconciled transaction shows a "Reconciled Transaction" warning modal before the change is applied | P0       |
| RECON-09 | Attempting to delete a reconciled transaction shows the same warning modal before the deletion happens                             | P0       |

**RECON-08 — detailed steps:**

1. Complete a full reconciliation (RECON-03/04) so at least one transaction is `reconciled: true`.
2. Attempt to edit that transaction's amount or category directly in the register.
3. Assert the "Reconciled Transaction" modal appears with the "editing reconciled transactions may bring your reconciliation out of balance" message, before any change is persisted.
4. Confirm the edit; assert the change is applied only after confirming.

**RECON-09 — detailed steps:**

1. Complete a full reconciliation (RECON-03/04) so at least one transaction is `reconciled: true`.
2. Select that transaction and attempt to delete it.
3. Assert the "Reconciled Transaction" modal appears (with the delete-specific message) before the transaction is removed.
4. Confirm the deletion; assert the transaction is removed only after confirming, then confirm the follow-up generic "Confirm Delete" modal.

> Implementation note: while writing this case, cancelling this specific
> warning was found to crash the app (`TypeError: onCancel is not a
function`) — the batch/selection-delete path
> (`checkForReconciledTransactions` in `useTransactionBatchActions.ts`)
> pushes the confirmation modal without an `onCancel` handler, unlike the
> single-transaction inline-edit path (RECON-08), which passes it
> correctly. Per direction, the test only exercises the Confirm path and
> documents the bug inline rather than fixing product code or asserting on
> the crash; it's flagged here for separate triage.

#### 2.5 Interaction with the "cleared" checkbox column

Correction from an earlier draft: `showCleared` in `Account.tsx` does **not**
control which transactions are visible (that's the separate, already-tested
"Hide reconciled transactions" toggle). It controls whether the **"cleared"
checkbox column** is shown in the register at all (account menu → `Show/Hide
"cleared" checkboxes`). `onReconcile` forces this column on for the duration
of reconciliation — so a user can check transactions off while reconciling
even if they'd normally hidden that column — and restores the prior state via
`onDoneReconciling`. This is non-obvious and currently untested.

| ID       | Title                                                                                                                                                                | Priority |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| RECON-10 | Starting reconciliation while the "cleared" checkbox column is hidden temporarily reveals it, then restores the prior column visibility once reconciliation finishes | P2       |

**RECON-10 — detailed steps:**

1. Via the account menu, select "Hide 'cleared' checkboxes" so the column is not shown.
2. Confirm the "cleared" checkbox column is absent from the transaction table.
3. Start reconciliation (open the reconcile menu and submit a balance).
4. Assert the "cleared" checkbox column is now visible while reconciliation is in progress.
5. Finish reconciliation (Lock transactions or Exit reconciliation).
6. Assert the "cleared" checkbox column is hidden again, matching the state from step 1.

---

## Priority Legend

- **P0** — Core money-correctness behavior; a regression here directly produces wrong financial totals shown to the user.
- **P1** — Important UI/state-consistency behavior; a regression is visible and confusing but not silently wrong.
- **P2** — Edge cases / lower-traffic interactions; valuable for completeness, lowest risk if temporarily broken.

## Out of Scope

- Tracking-budget equivalents of carryover (`tracking/BalanceMenu.tsx`) — same underlying mechanic, different budget type; could be a follow-up.
- `IncomeMenu`'s income-carryover ("auto hold") — related but distinct from the three actions above.
- Mobile variants of either feature — desktop budget actions are covered on mobile already (`budget.mobile.test.ts` / `budget-automations.mobile.test.ts`); reconciliation's mobile equivalent (if any) is not investigated here.
- Reconciling transfer transactions specifically (the `batchEditWithReconciledTransfer` / `batchDeleteWithReconciledTransfer` warning variants) — same guard-rail mechanism as RECON-08/09, called out as a follow-up rather than a separate case.
- Multi-account or multi-currency reconciliation edge cases.
