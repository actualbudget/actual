## Why

The `opsx_pp_13_99` branch has the core pay period engine and context wiring but is missing several utility functions needed for complete UI integration. These functions were developed on a sibling branch (`opsx_pp_sep_specs`) and need to be ported to the main pay period branch. Without them, budget header highlighting breaks in pay period mode, transaction filtering uses incorrect date ranges, and toggling pay periods on/off can leave stale period IDs in preferences.

## What Changes

- Add `isCurrentPeriod(month, config?)` to `pay-periods.ts` — a mode-agnostic check that returns whether a month ID is the current pay period (when active) or current calendar month (when not). Replaces scattered `monthUtils.isCurrentMonth()` calls that don't understand pay period IDs.
- Add `resolveMonthToDateFilter(month, config?)` to `pay-periods.ts` — converts a month/period ID to a query-compatible date filter (`$gte/$lte` for pay periods, `$transform/$month` for calendar months). Required for transaction list filtering in CategoryTransactions.
- Add `'short'` format to `getPayPeriodLabel()` — a compact date-range display (`Jan 5 - Jan 18`) without period numbers, suitable for mobile budget headings.
- Add `resolveStartMonth(stored, config, fallback)` to `months.ts` — returns the stored start month when its format matches the current mode, falling back otherwise. Prevents stale pay period IDs persisting when the user toggles pay period mode off.
- Wire `isCurrentPeriod` into `EnvelopeBudgetComponents.tsx` and `TrackingBudgetComponents.tsx` to replace `monthUtils.isCurrentMonth()` for budget header background color highlighting.
- Add 10 unit tests covering all new functions.

## Capabilities

### New Capabilities

- `pay-period-query-utils`: Utility functions for resolving pay period IDs to date filters, detecting the current period, and handling mode-aware start month resolution.

### Modified Capabilities

- `pay-period-ui`: Budget header highlighting now uses `isCurrentPeriod()` instead of `monthUtils.isCurrentMonth()`, and `getPayPeriodLabel` gains a `'short'` format.

## Impact

- `packages/loot-core/src/shared/pay-periods.ts` — new exports: `isCurrentPeriod`, `resolveMonthToDateFilter`; modified export: `getPayPeriodLabel`
- `packages/loot-core/src/shared/months.ts` — new export: `resolveStartMonth`
- `packages/loot-core/src/shared/pay-periods.test.ts` — 10 new test cases
- `packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx` — import and use `isCurrentPeriod`
- `packages/desktop-client/src/components/budget/tracking/TrackingBudgetComponents.tsx` — import and use `isCurrentPeriod`
- No API changes, no database changes, no breaking changes
