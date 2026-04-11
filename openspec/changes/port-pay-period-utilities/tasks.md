## 1. Core Utility Functions

- [x] 1.1 Add `isCurrentPeriod(month, config?)` to `packages/loot-core/src/shared/pay-periods.ts`
- [x] 1.2 Add `resolveMonthToDateFilter(month, config?)` to `packages/loot-core/src/shared/pay-periods.ts`
- [x] 1.3 Add `'short'` format support to `getPayPeriodLabel()` in `packages/loot-core/src/shared/pay-periods.ts`
- [x] 1.4 Add `resolveStartMonth(stored, config, fallback)` to `packages/loot-core/src/shared/months.ts`

## 2. Unit Tests

- [x] 2.1 Add test cases for `isCurrentPeriod` (5 scenarios: current/non-current calendar, current/non-current pay period, calendar ID with config fallback)
- [x] 2.2 Add test cases for `resolveMonthToDateFilter` (4 scenarios: calendar without config, calendar with config, pay period with config, pay period without config)
- [x] 2.3 Add test case for `getPayPeriodLabel('short')` format
- [x] 2.4 Add test cases for `resolveStartMonth` (4 scenarios: matching calendar, matching pay period, stale pay period, stale calendar)

## 3. UI Wiring

Note: after the master merge, desktop-client uses Node subpath imports. Use `#components/budget/PayPeriodContext` for `usePayPeriodConfig` and `@actual-app/core/shared/pay-periods` for `isCurrentPeriod`. `actual/prefer-subpath-imports` is now enforced for desktop-client.

- [x] 3.1 Wire `isCurrentPeriod` into `EnvelopeBudgetComponents.tsx` — import `usePayPeriodConfig` from `#components/budget/PayPeriodContext` and `isCurrentPeriod` from `@actual-app/core/shared/pay-periods`; replace `monthUtils.isCurrentMonth(month)` with `isCurrentPeriod(month, config)` at all 4 call sites:
  - line ~153 (`ExpenseGroupMonth`, header background)
  - line ~246 (`ExpenseCategoryMonth`, row background)
  - line ~545 (`IncomeGroupMonth`, header background)
  - line ~584 (`IncomeCategoryMonth`, row background)
- [x] 3.2 Wire `isCurrentPeriod` into `TrackingBudgetComponents.tsx` — same imports as 3.1; replace at both call sites:
  - line ~149 (`GroupMonth`, header background)
  - line ~232 (`CategoryMonth`, row background)

## 4. Validation

- [ ] 4.1 Run `yarn typecheck` and fix any type errors
- [ ] 4.2 Run `yarn lint:fix` and fix any lint issues
- [ ] 4.3 Run `yarn test` and verify all new and existing tests pass
