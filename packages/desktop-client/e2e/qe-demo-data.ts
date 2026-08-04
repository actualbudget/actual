/**
 * Facts about the "Try the demo" seed data that the QE exercise specs rely on.
 *
 * `ConfigurationPage.createTestFile()` seeds a budget file deterministically,
 * so the category ordering below is stable across runs. The existing
 * `budget.test.ts` already depends on these same indices.
 *
 * Amounts are NOT stable -- the seeder generates fresh values each run, which
 * is why every spec asserts on deltas (read, act, assert the change) instead of
 * on any literal dollar figure.
 */

/** Row 0 is the category-group header; categories start at 1. */
export const DEMO_CATEGORY_ROW = {
  Food: 1,
  Restaurants: 2,
  Entertainment: 3,
} as const;

export type DemoCategoryName = keyof typeof DEMO_CATEGORY_ROW;

/**
 * Accounts seeded by the demo file carry pinned "Upcoming/Due/Missed"
 * schedule-preview rows, which always sort above real transactions. Any test
 * that reasons about a specific row index must create its own empty account
 * (`Navigation.createAccount`) rather than reuse one of these -- otherwise
 * `getNthTransaction(0)` returns a schedule preview, not the transaction the
 * test just created.
 */
export const DEMO_SEEDED_ACCOUNT = 'Bank of America';
