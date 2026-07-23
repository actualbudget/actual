# Custom Budget Cycle Feasibility

## Introduction

This document investigates the feasibility of supporting a configurable monthly budget-cycle start day in Actual Budget. The goal is to allow a cycle to start on any day from 1 through 28, rather than strictly on the 1st of the month, while preserving backward compatibility and performance.

## Current Architecture and Data Flow

- **Budget Representation:** Budgets are tied to calendar months identified by the `YYYY-MM` string format.
- **Date/Month Utilities:** `packages/loot-core/src/shared/months.ts` provides utility functions (`monthFromDate`, `bounds`, etc.) to map calendar dates to budget month identifiers and fetch date ranges.
- **Budget Computation:** The budget engine (`packages/loot-core/src/server/budget/base.ts`, `envelope.ts`, `tracking.ts`) uses cached spreadsheets (in-memory DAG structure) to compute budgets dynamically.
- **SQL Data Grouping:** Many core SQL queries rely on the integer formatting of dates (`YYYYMMDD`). They group dates into months using integer division by 100 (`t.date / 100`) to compute sums for categories per month (e.g., `getSumAmountsByMonth` in `base.ts`).
- **Transaction Updates:** When transactions are created/updated, `triggerBudgetChanges` maps the transaction date to a `YYYY-MM` month using `monthUtils.monthFromDate(db.fromDateRepr(transaction.date))` and invalidates specific cells in the spreadsheet engine for that month.

## Every Important Calendar-Month Assumption Found

1.  **Date String Parsing:** `YYYY-MM` is parsed directly into calendar-month boundaries. `monthUtils.bounds('YYYY-MM')` returns the 1st and last day of the calendar month as `YYYYMMDD` integer timestamps.
2.  **Date Grouping in SQL:** `CAST(t.date / 100 AS INTEGER)` is heavily used in SQL statements (e.g., `getSumAmountsByMonth`, `getFirstActivityMonth` in `actions.ts`) to group transaction dates into calendar months.
3.  **UI Grouping:** The frontend components largely assume standard calendar months for budget headers and views.
4.  **Transaction Boundary Updates:** Transactions currently belong to exactly one period. Recomputing a single month is sufficient if a transaction date changes within the same calendar month.

## Affected Source Files

- `packages/loot-core/src/types/prefs.ts` (needs `budgetCycleStartDay` property)
- `packages/loot-core/src/shared/months.ts` (API to convert dates to budget months considering `budgetCycleStartDay`)
- `packages/loot-core/src/server/budget/base.ts` (transaction updating, sum calculations via `getSumAmountsByMonth`)
- `packages/loot-core/src/server/budget/actions.ts` (SQL grouping by month)
- `packages/loot-core/src/server/budget/envelope.ts` / `tracking.ts` (budget creation)
- `packages/desktop-client/src/components/budget/` (UI header components displaying the active period)

## Affected Tests

- `packages/loot-core/src/shared/months.test.ts`
- `packages/loot-core/src/server/budget/base.test.ts`
- `packages/loot-core/src/server/budget/category-template-context.test.ts`
- E2E Tests in `packages/desktop-client/e2e/budget.test.ts` (or similar) that assert on period boundaries.

## Recommended Data Model

1.  **Identifier Preservation:** Continue to use `YYYY-MM` string identifiers for budget sheets. A budget cycle starting on the 15th of June (2026-06-15) and ending on the 14th of July (2026-07-14) will be identified as `2026-06`.
2.  **Preference Configuration:** Add `budgetCycleStartDay: number` (1-28) to the `SyncedPrefs` interface in `packages/loot-core/src/types/prefs.ts`. The default value should be 1.

## Proposed Period-Calculation API

Modify or wrap existing utilities in `packages/loot-core/src/shared/months.ts`:

- `getBudgetMonth(date: string, startDay: number = 1): string`: Determines the `YYYY-MM` identifier for a given date based on the `startDay`.
  - _Logic:_ If the calendar date day < `startDay`, the date belongs to the _previous_ calendar month's budget cycle. Otherwise, it belongs to the _current_ calendar month's budget cycle.
- `getBudgetBounds(month: string, startDay: number = 1): { start: number, end: number }`:
  - _Logic:_ For month `YYYY-MM`, start is `YYYY-MM-[startDay]`. End is `prevMonth(YYYY-[MM+1]-[startDay])`. It returns the integer representation.
- _Note:_ Functions like `nextMonth`, `prevMonth` should remain unchanged as they operate on the logical `YYYY-MM` identifiers. Calendar views and normal date utilities should remain unaffected.

## SQL Aggregation Implications

The assumption that `t.date / 100` maps a transaction to its budget month breaks when `startDay != 1`.

- **Impact:** Queries such as `getSumAmountsByMonth` in `base.ts` must be adjusted.
- **Resolution:** We can no longer solely rely on simple division. We either need to:
  1.  Pass the `startDay` into SQL and compute the month using math (e.g. `CAST((t.date - startDay + 1) / 100 AS INTEGER)` roughly, though proper date arithmetic in sqlite is safer if formatted string dates are used).
  2.  Write a custom sqlite scalar function to resolve a date to a budget month identifier integer.
  3.  Shift the date by `(startDay - 1)` days backwards in SQL before taking `/ 100`. (e.g. using sqlite `date(..., '-X days')` if using string dates, but date fields are integers here `YYYYMMDD`).
      _Since dates are stored as integer `YYYYMMDD`, `(date - startDay + 1)` doesn't work across month boundaries. The most robust approach might be to query the bounds from the application layer or use SQLite's `date()` functions by converting `YYYYMMDD` to a string first._

## Transaction Recalculation Implications

In `packages/loot-core/src/server/budget/base.ts` -> `handleTransactionChange`:

- When a transaction date changes, it might cross the custom boundary (e.g., changing from the 14th to the 15th).
- The logic must fetch the **old** budget month and the **new** budget month using `getBudgetMonth`.
- It must invalidate and recompute the `sum-amount` cells in both the previous and new budget months.

## Rollover Implications

- Because we retain `YYYY-MM` as the logical identifier, the core rollover logic (from `prevMonth` to `currentMonth`) remains intact.
- The dependencies in the DAG (e.g., `leftover-pos-${cat.id}`, `from-last-month`) reference the previous month via `prevSheetName`. Since the sequence of months doesn't change, rollover works implicitly with the new bounds.

## Settings and Synchronisation Implications

- Store `budgetCycleStartDay` in `SyncedPrefs`.
- When `budgetCycleStartDay` changes, we must force a full recompute of the budget history because transactions will shift into different budget months.
- The user must be warned in the UI before they change this setting, as it is a destructive/re-organizing action for historical budgeting.
- Requires calling `createAllBudgets()` and invalidating all cached sums.

## Reporting Implications

- Standard calendar reports will need a toggle or must decouple from budget months if the user wants calendar-month reports.
- If reports rely on `getSumAmountsByMonth` grouped by `date / 100`, they will show calendar months, not budget months. We must decide if reports reflect the _Budget Cycle_ or _Calendar Month_.

## Backwards-Compatibility Risks

- Defaulting the setting to 1 ensures that users who do not change the setting see exactly the same mathematical and date boundary behaviors.
- Replacing `t.date / 100` with complex SQLite date math could introduce minor performance regressions for users on day 1 if we apply a generic query. The system might need conditional queries (one for `startDay === 1` and one for `startDay > 1`).

## Migration Risks

- No database schema migrations are necessary for transactions or accounts.
- Existing `zero_budget_months` and spreadsheet cache will become stale if a user changes the setting. We must invalidate the spreadsheet cache and rebuild budget totals upon detecting a setting change.

## Phased Implementation Plan

1.  **Phase 1 (Core Utilities):** Introduce `getBudgetMonth` and `getBudgetBounds` to `shared/months.ts` and add `budgetCycleStartDay` to `SyncedPrefs` and `MetadataPrefs` with a default of 1. Update unit tests.
2.  **Phase 2 (SQL & Recalculation):** Update `getSumAmountsByMonth` and `handleTransactionChange` in `budget/base.ts` to respect the `budgetCycleStartDay` preference. Add conditional SQL handling if `startDay === 1` to preserve performance. Update action queries (`getFirstActivityMonth`).
3.  **Phase 3 (Spreadsheet/Recompute):** Add a hook to rebuild all budget sheets when `budgetCycleStartDay` changes.
4.  **Phase 4 (UI/Frontend):** Update the Budget Header to show "Jun 15 - Jul 14" instead of just "June". Add a dropdown in the Settings page to configure the start day with a warning modal.

## Test Matrix

- **Unit Tests:**
  - `getBudgetMonth` correctly assigns 14th and 15th of the month to different periods when start day is 15.
  - `getBudgetBounds` correctly identifies leap years and variable days in a month.
- **Integration Tests:**
  - Transaction on 14th correctly affects previous month's budget.
  - Transaction on 15th correctly affects current month's budget.
  - Changing date from 14th to 15th removes spend from old month and adds to new month.
- **E2E Tests:**
  - User can change setting. Warning is displayed.
  - Budget header updates to show date range.

## Unresolved Questions

1.  **SQLite Performance:** What is the performance overhead of custom SQLite date grouping compared to integer division? Should we use `substr(date(substring(t.date,1,4)||'-'||substring(t.date,5,2)||'-'||substring(t.date,7,2), '-14 days'), 1, 7)` in queries?
2.  **Reporting:** Should Net Worth and Cash Flow reports follow the budget cycle or the standard calendar month?
3.  **Scheduled Transactions:** How does changing the budget start day affect scheduled transaction logic? Do recurring transactions need re-alignment?
