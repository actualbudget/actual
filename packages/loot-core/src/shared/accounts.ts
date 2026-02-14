/**
 * Suggested account type choices based on the YNAB5 AccountType enum,
 * stored and displayed in title case.
 */
export const ACCOUNT_TYPES = [
  'Checking',
  'Savings',
  'Cash',
  'Credit Card',
  'Line of Credit',
  'Other Asset',
  'Other Liability',
  'Mortgage',
  'Auto Loan',
  'Student Loan',
  'Personal Loan',
  'Medical Debt',
  'Other Debt',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Convert a camelCase string (e.g. from YNAB5 AccountType enum) to title case.
 * Examples:
 *   'creditCard'    -> 'Credit Card'
 *   'lineOfCredit'  -> 'Line Of Credit'
 *   'otherAsset'    -> 'Other Asset'
 *   'checking'      -> 'Checking'
 */
export function camelToTitleCase(str: string): string {
  // Insert a space before each uppercase letter, then title-case each word
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}
