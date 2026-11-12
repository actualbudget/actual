import * as monthUtils from '@actual-app/core/shared/months';
import { isTemplateExpired } from '@actual-app/core/shared/templates';
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
  | { kind: 'by-negative-amount' }
  | { kind: 'spend-no-from' }
  | { kind: 'spend-from-after-target' }
  | { kind: 'adjustment-out-of-range' };

function isAdjustmentOutOfRange(template: Template): boolean {
  if (
    (template.type === 'schedule' ||
      template.type === 'average' ||
      template.type === 'weeklyAverage') &&
    template.adjustment !== undefined &&
    template.adjustmentType === 'percent'
  ) {
    return template.adjustment <= -100 || template.adjustment > 1000;
  }
  return false;
}

// A passed target doesn't stop the engine, which skips it in later months, so
// it's shown as a warning without blocking save.
export function isBlockingAutomationError(
  error: AutomationErrorKind | null,
): boolean {
  return error !== null && error.kind !== 'by-target-past';
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
    case 'schedule': {
      if (template.type !== 'schedule') return null;
      if (!template.scheduleId && !template.name) {
        return { kind: 'schedule-not-found', name: '' };
      }
      const match = schedules.find(s =>
        template.scheduleId
          ? s.id === template.scheduleId
          : s.name === template.name,
      );
      if (!match || match.completed || match.tombstone) {
        return { kind: 'schedule-not-found', name: template.name ?? '' };
      }
      if (isAdjustmentOutOfRange(template)) {
        return { kind: 'adjustment-out-of-range' };
      }
      return null;
    }
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
      // The engine never budgets toward a negative target, and notes can't
      // express one, so flag any saved before that was disallowed.
      if (template.amount < 0) {
        return { kind: 'by-negative-amount' };
      }
      const targetMonth = template.month;
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
      // Checked last: it's only a warning, so returning it earlier would hide
      // the blocking errors above. Uses the same rule the engine uses to skip
      // expired targets, measured from today like the engine's warning after a
      // template run.
      if (isTemplateExpired(template, monthUtils.monthFromDate(today))) {
        return { kind: 'by-target-past', month: targetMonth };
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

// The engine (CategoryTemplateContext.checkByAndSchedule) requires
// every schedule and by-date template in a category to share one priority; if
// they don't, none of them budget. Surface that as a conflict so it can't be
// saved. Expired targets still count, as they do in the engine, so a mismatch
// fails the same way in every month.
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
