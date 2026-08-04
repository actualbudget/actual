import type { TFunction } from 'i18next';

/**
 * Default widget / dashboard names written as plain English into budget data
 * (see packages/loot-core/src/shared/dashboard.ts and migrations).
 * These are user-editable fields, not i18n keys at storage time — translate
 * only when the stored value still matches a known default.
 */

/**
 * Exact default markdown-card body from
 * packages/loot-core/src/shared/dashboard.ts (markdown-card meta.content).
 * Keep in sync — display-layer only; do not rewrite stored budget data.
 */
export const DEFAULT_DASHBOARD_TIPS_MARKDOWN =
  '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".';

export const DEFAULT_DASHBOARD_WIDGET_NAMES = [
  // packages/loot-core/src/shared/dashboard.ts
  'Total Income (YTD)',
  'Total Expenses (YTD)',
  'Avg Per Month',
  'Avg Per Transaction',
  'This Month',
  'Budget Overview',
  '3-Month Average',
  'Transaction Calendar',
  'Recent Net Worth Change',
  // Built-in card fallbacks used when meta.name is empty (still map if stored)
  'Net Worth',
  'Cash Flow',
  'Monthly Spending',
  'Summary',
  'Calendar',
  'Sankey',
  'Age of Money',
  'Balance Forecast',
  'Formula',
  'Budget Analysis',
  'Crossover Point',
  'Monte Carlo Analysis',
] as const;

/** Default first dashboard page name (migration + initial page). */
export const DEFAULT_DASHBOARD_PAGE_NAMES = ['Main'] as const;

const DEFAULT_NAME_SET = new Set<string>([
  ...DEFAULT_DASHBOARD_WIDGET_NAMES,
  ...DEFAULT_DASHBOARD_PAGE_NAMES,
]);

export function isDefaultDashboardName(name: string): boolean {
  return DEFAULT_NAME_SET.has(name);
}

/**
 * Display helper for stored widget/page names.
 * - empty → fallback (already passed through t() by caller)
 * - known English default → t(name) so locale packs can translate it
 * - anything else (user rename) → shown as stored
 */
export function translateWidgetName(
  name: string | null | undefined,
  t: TFunction,
  fallback: string,
): string {
  if (!name) {
    return fallback;
  }
  if (isDefaultDashboardName(name)) {
    return t(name);
  }
  return name;
}

/**
 * Display helper for default dashboard markdown tips.
 * Only translates when content still exactly matches the seeded English text.
 * Custom / edited markdown is left as stored.
 */
export function translateDashboardMarkdownContent(
  content: string | null | undefined,
  t: TFunction,
): string {
  if (!content) {
    return content ?? '';
  }
  if (content === DEFAULT_DASHBOARD_TIPS_MARKDOWN) {
    return t(DEFAULT_DASHBOARD_TIPS_MARKDOWN);
  }
  return content;
}
