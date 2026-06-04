import * as monthUtils from '@actual-app/core/shared/months';
import type { ScheduleEntity } from '@actual-app/core/types/models';
import type { Template } from '@actual-app/core/types/models/templates';

import type { DisplayTemplateType } from './constants';

export type AutomationErrorKind =
  | { kind: 'schedule-not-found'; name: string }
  | { kind: 'refill-no-cap' }
  | { kind: 'limit-no-contributor' }
  | { kind: 'percentage-out-of-range'; percent: number }
  | { kind: 'percentage-no-source' }
  | { kind: 'percentage-source-not-found'; source: string }
  | { kind: 'by-no-month' }
  | { kind: 'by-target-past'; month: string }
  | { kind: 'spend-no-from' }
  | { kind: 'spend-from-after-target' }
  | { kind: 'adjustment-out-of-range' };

function isAdjustmentOutOfRange(template: Template): boolean {
  if (
    (template.type === 'schedule' || template.type === 'average') &&
    template.adjustment !== undefined &&
    template.adjustmentType === 'percent'
  ) {
    return template.adjustment <= -100 || template.adjustment > 1000;
  }
  return false;
}

export type GlobalConflictKind =
  | { kind: 'over-income'; total: number; income: number }
  | { kind: 'percent-over-100'; total: number }
  | { kind: 'schedule-priority-mismatch' };

export function validateAutomation(
  template: Template,
  displayType: DisplayTemplateType,
  allTemplates: readonly Template[],
  schedules: readonly ScheduleEntity[],
  today: Date,
  // Set of recognised percentage sources (income category ids, lower-cased
  // category names, and special source aliases like 'all income'). When
  // omitted the source-not-found check is skipped (the engine still validates
  // server-side at apply time).
  validPercentageSources?: ReadonlySet<string>,
): AutomationErrorKind | null {
  switch (displayType) {
    case 'schedule':
      if (template.type !== 'schedule') return null;
      if (!template.name) return { kind: 'schedule-not-found', name: '' };
      if (
        !schedules.some(
          s => s.name === template.name && !s.completed && !s.tombstone,
        )
      ) {
        return { kind: 'schedule-not-found', name: template.name };
      }
      if (isAdjustmentOutOfRange(template)) {
        return { kind: 'adjustment-out-of-range' };
      }
      return null;
    case 'historical':
      if (isAdjustmentOutOfRange(template)) {
        return { kind: 'adjustment-out-of-range' };
      }
      return null;
    case 'refill':
      if (!allTemplates.some(t => t.type === 'limit')) {
        return { kind: 'refill-no-cap' };
      }
      return null;
    case 'limit':
      if (
        !allTemplates.some(
          t => t.type !== 'limit' && t.type !== 'goal' && t.type !== 'error',
        )
      ) {
        return { kind: 'limit-no-contributor' };
      }
      return null;
    case 'percentage':
      if (template.type !== 'percentage') return null;
      if (!template.category) return { kind: 'percentage-no-source' };
      if (template.percent <= 0 || template.percent > 100) {
        return {
          kind: 'percentage-out-of-range',
          percent: template.percent,
        };
      }
      if (
        validPercentageSources &&
        !validPercentageSources.has(template.category) &&
        !validPercentageSources.has(template.category.toLowerCase())
      ) {
        return {
          kind: 'percentage-source-not-found',
          source: template.category,
        };
      }
      return null;
    case 'by': {
      if (template.type !== 'by' && template.type !== 'spend') return null;
      if (!template.month || !monthUtils.isValidYearMonth(template.month)) {
        return { kind: 'by-no-month' };
      }
      const targetMonth = template.month;
      const startOfTodayMonth = monthUtils.monthFromDate(today);
      // Pass bare YYYY-MM strings, matching the server-side check in
      // CategoryTemplateContext.checkByAndScheduleAndSpend and avoiding the
      // local-vs-UTC parsing footgun called out in shared/months.ts:_parse.
      const monthsRemaining = monthUtils.differenceInCalendarMonths(
        targetMonth,
        startOfTodayMonth,
      );
      // Recurring goals (annual/repeat) anchored on a past month are
      // legitimate — the engine rolls them forward by the period. Only flag
      // the past-target case for one-shot goals. Mirrors the server check in
      // CategoryTemplateContext.checkByAndScheduleAndSpend.
      if (monthsRemaining < 0 && !template.annual && !template.repeat) {
        return { kind: 'by-target-past', month: targetMonth };
      }
      if (template.type === 'spend') {
        if (!template.from || !monthUtils.isValidYearMonth(template.from)) {
          return { kind: 'spend-no-from' };
        }
        if (
          monthUtils.differenceInCalendarMonths(targetMonth, template.from) < 0
        ) {
          return { kind: 'spend-from-after-target' };
        }
      }
      return null;
    }
    default:
      return null;
  }
}

export function validatePercentageAllocation(
  templates: readonly Template[],
): GlobalConflictKind | null {
  const percentBySource = new Map<string, number>();
  for (const t of templates) {
    if (t.type !== 'percentage' || !t.category) continue;
    const key = `${t.previous}|${t.category.toLocaleLowerCase()}`;
    percentBySource.set(key, (percentBySource.get(key) ?? 0) + t.percent);
  }
  const maxPercent = Math.max(0, ...percentBySource.values());
  return maxPercent > 100
    ? { kind: 'percent-over-100', total: maxPercent }
    : null;
}

// The engine (CategoryTemplateContext.checkByAndScheduleAndSpend) requires
// every schedule and by-date template in a category to share one priority; if
// they don't, none of them budget. Surface that as a conflict so it can't be
// saved.
export function validateSchedulePriorities(
  templates: readonly Template[],
): GlobalConflictKind | null {
  const priorities = new Set<number>();
  for (const t of templates) {
    if (t.type === 'schedule' || t.type === 'by') {
      priorities.add(t.priority);
    }
  }
  return priorities.size > 1 ? { kind: 'schedule-priority-mismatch' } : null;
}
