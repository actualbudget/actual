# E2E Test Plan — Budgeting & Transactions

## Scope

This test plan focuses on Actual Budget's two core features: **envelope budgeting** and **transactions**. Rather than testing everything from scratch, the goal is to find specific gaps in the existing test suite and fill them. The existing suite is already thorough, so the work is about identifying what's been missed, not rebuilding what's already there.

## What's Already Covered

The existing test suite covers a lot of ground:

- **Budget tests** include checking that the summary panel displays correctly, transferring money between categories, and navigating through the interface. However, the tests focus on whether things appear or navigate correctly — not on verifying the core action of assigning money to a budget.
- **Transaction tests** are comprehensive: creating transactions, filtering them by date/category/payee, and even importing transactions from CSV files. Editing transactions and checking the running balance also work well.
- **Account tests** cover creating accounts, managing them, and performing bulk operations like transfers.

The suite is well-designed, but there are specific interactions that are only checked for visibility, not for actually working.

## Gaps Identified

Three specific gaps emerged:

1. **Assigning a budgeted amount is never verified.** The page has a method called `setBudgetedAmount()`, but it's only used in one test for reports setup — never to actually verify that assigning money to a category updates the budget. This is the core action of the app.

2. **Budget amounts staying independent across months is never checked on desktop.** The app should let you assign different amounts to the same category each month without them affecting each other. This is tested on mobile, but not on desktop.

3. **Deleting a transaction is never completed.** A test checks that the Delete button exists in the menu, but no test actually clicks it, confirms the deletion, and verifies the transaction is gone.

4. **Renaming accounts and categories is never completed.** Similar to deletion — the tests check that Rename buttons exist, but never actually perform the rename action. _(Documented but not addressed in this round.)_

## Test Cases

### Budget Tests

| Scenario                                   | Verification                                                                                                                           | Reasoning                                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Assigning money to a budget category       | Assign $1200 to "Food" category. Verify the category's budgeted amount shows $1200 and the table's total-budgeted updates accordingly. | The core envelope budgeting action had zero verification. Without this, we can't confirm assignments actually work.              |
| Budget amounts stay separate across months | Assign $400 to "Food" in June, then assign $900 to "Food" in July. Navigate back to June and verify it still shows $400.               | Multi-month independence is essential for monthly budgeting. A regression here would silently break the month-to-month workflow. |

### Transaction Tests

| Scenario                                                   | Verification                                                                                                                                                                                                   | Reasoning                                                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Deleting a transaction removes it and restores the balance | Create a transaction for $50. Note the account balance. Right-click the transaction, click Delete, confirm the deletion. Verify the transaction row is gone and the balance is restored to its previous value. | Deletion is a fundamental operation that was only checked for menu visibility, never for actually working. |

## Out of Scope (Identified but Not Implemented)

Two additional gaps were identified but marked for future work:

- **Account rename:** The Rename button exists and opens an edit field, but no test verifies that clicking Enter saves the name.
- **Category/Group rename:** Similar to accounts — the edit field appears but the save is untested.

Both follow the same pattern as the other gaps (menu visibility checked, action never completed). They're documented for the next round of testing.

## Summary

Three gaps in the existing suite were identified and addressed with new tests, all of which pass locally. The gaps targeted core actions (assigning budgets, deleting transactions, maintaining monthly budget independence) that were either never tested or only checked for appearance rather than functionality.
