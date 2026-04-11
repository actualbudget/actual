## Context

The pay period feature on `opsx_pp_13_99` has a working engine (`pay-periods.ts`) and context provider (`PayPeriodProvider`), but several utility functions needed for complete UI integration were developed on a sibling branch. The base branch uses `monthUtils.isCurrentMonth()` which doesn't understand pay period IDs (format `YYYY-13` through `YYYY-99`), causing budget headers to never highlight as "current" when pay periods are active.

## Goals / Non-Goals

**Goals:**

- Add mode-agnostic utility functions that work transparently with both calendar months and pay period IDs
- Wire budget header highlighting to work correctly in pay period mode
- Provide query filter resolution for transaction filtering
- Handle stale start month preferences when toggling pay period mode

**Non-Goals:**

- Refactoring the PayPeriodProvider or context pattern (already established)
- Mobile CategoryPage/CategoryTransactions wiring (separate change — context pattern already handles this)
- Changes to pay period generation, navigation, or configuration

## Decisions

### 1. `isCurrentPeriod` lives in `pay-periods.ts`, not `months.ts`

**Rationale**: It depends on `getPayPeriodFromDate` and `isPayPeriod` which are pay-period-specific. Putting it in `months.ts` would create a circular dependency since `months.ts` is the lower-level module. The function delegates to calendar month comparison when pay periods aren't active, so it's a pay-period-aware wrapper.

**Alternative considered**: Adding to `months.ts` alongside `isCurrentMonth`. Rejected because it would require importing pay period functions into the calendar utility module, inverting the dependency direction.

### 2. `resolveMonthToDateFilter` returns a plain object, not a query builder

**Rationale**: The existing filter pattern in loot-core uses plain objects with `$gte/$lte` or `$transform/$month` keys. Returning the same shape keeps it consistent with how filters are constructed elsewhere (e.g., `subfieldFromFilter`). No need for abstraction — these are the only two shapes needed.

### 3. `resolveStartMonth` lives in `months.ts`

**Rationale**: It's a general-purpose "pick the right start month" function that doesn't depend on pay period generation — only on `isPayPeriod()` (a simple regex check). It belongs alongside other month navigation utilities. It bridges the gap when preferences contain a stale period ID after the user disables pay periods (or vice versa).

### 4. Wire via existing `PayPeriodProvider` context, not prop-drilling

**Rationale**: The base branch already wraps budget pages in `PayPeriodProvider`. The budget components (`EnvelopeBudgetComponents`, `TrackingBudgetComponents`) can access config via `usePayPeriodConfig()` hook. No new props needed — just import the hook and call `isCurrentPeriod(month, config)`.

### 5. `'short'` format as a third option in `getPayPeriodLabel`

**Rationale**: The existing function has `'picker'` and `'summary'` formats. Mobile surfaces need a compact date range without period numbers. Adding `'short'` as a union type member keeps the API consistent and avoids a separate function.

## Risks / Trade-offs

- **[Risk] `isCurrentPeriod` uses `new Date()` internally** → Testable by mocking `vi.useFakeTimers()` in tests. The existing test suite already uses this pattern.
- **[Risk] `resolveMonthToDateFilter` duplicates date bounds logic** → It calls `generatePayPeriods` + `.find()` rather than reusing `bounds()`. This is intentional: `bounds()` is a `months.ts` extension that returns `{ start, end }` strings, while the filter needs `{ $gte, $lte }` object shape. The duplication is minimal (3 lines) and avoids coupling to the extended months API.
- **[Trade-off] No migration needed** → These are purely additive functions. Existing `monthUtils.isCurrentMonth()` calls outside budget components remain unchanged.
