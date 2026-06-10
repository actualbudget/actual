/**
 * Money utilities for parsing and formatting currency values.
 *
 * Actual Budget stores amounts internally as "milliunits" (1/1000 of a dollar)
 * but displays them as dollar strings like "$500.00" or "-$75.50".
 *
 * In this E2E framework:
 * - Test data uses plain dollar numbers (e.g. 500 = $500.00, 75.5 = $75.50).
 * - Assertions compare `parseMoney(balanceText)` against `computeExpectedBalance()`.
 *
 * All functions are pure and throw on invalid input so that test failures are
 * caught at the assertion, not silently swallowed.
 */

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Formats a dollar amount as a human-readable currency string.
 * Matches the format Actual Budget displays in the UI: "$500.00".
 *
 * @param dollars Dollar amount (may be negative for credit balances).
 */
export function formatMoney(dollars: number): string {
  const absValue = Math.abs(dollars);
  const formatted = absValue.toFixed(2);
  return dollars < 0 ? `-$${formatted}` : `$${formatted}`;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parses a UI currency string into a dollar float.
 *
 * Handles:
 *   "$500.00"   → 500
 *   "-$75.50"   → -75.5
 *   "($75.50)"  → -75.5   (parenthetical negative, used in some regions)
 *   "500.00"    → 500     (no currency symbol)
 *   "1,234.56"  → 1234.56 (comma thousands separator)
 *
 * @throws {Error} if the string does not represent a valid dollar amount.
 */
export function parseMoney(text: string): number {
  const trimmed = text.trim();

  // Detect parenthetical negation: (75.50) → -75.50
  const isParenNegative = trimmed.startsWith('(') && trimmed.endsWith(')');

  // Strip all non-numeric characters except the decimal point and leading minus
  const stripped = trimmed
    .replace(/[()$\s,]/g, '') // remove parens, dollar sign, spaces, commas
    .replace(/^-/, ''); // remove leading minus temporarily

  const isNegative = trimmed.startsWith('-') || isParenNegative;

  const numeric = parseFloat(stripped);
  if (isNaN(numeric)) {
    throw new Error(`parseMoney: cannot parse "${text}" as a dollar amount`);
  }

  return isNegative ? -numeric : numeric;
}

// ─── Comparison helpers ───────────────────────────────────────────────────────

/**
 * Compares two dollar values with a small epsilon to avoid floating-point
 * precision errors from repeated arithmetic (e.g. 0.1 + 0.2 ≠ 0.3).
 *
 * Use this instead of strict equality when computing expected balances.
 */
export function moneyEquals(a: number, b: number, epsilonCents = 0.001): boolean {
  return Math.abs(a - b) < epsilonCents;
}

/**
 * Rounds a dollar amount to 2 decimal places.
 * Prevents floating-point drift in expected-balance calculations.
 */
export function roundMoney(dollars: number): number {
  return Math.round(dollars * 100) / 100;
}
