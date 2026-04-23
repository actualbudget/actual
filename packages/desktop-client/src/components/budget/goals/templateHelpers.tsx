import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Trans } from 'react-i18next';

import {
  SvgChartPie,
  SvgEquals,
  SvgMoneyBag,
  SvgPiggyBank,
  SvgShare,
  SvgTime,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { Template } from '@actual-app/core/types/models/templates';

import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

import type { Action } from './actions';
import type { DisplayTemplateType, ReducerState } from './constants';
import { BySaveAutomation } from './editor/BySaveAutomation';
import { BySaveAutomationReadOnly } from './editor/BySaveAutomationReadOnly';
import { HistoricalAutomation } from './editor/HistoricalAutomation';
import { HistoricalAutomationReadOnly } from './editor/HistoricalAutomationReadOnly';
import { LimitAutomation } from './editor/LimitAutomation';
import { LimitAutomationReadOnly } from './editor/LimitAutomationReadOnly';
import { PercentageAutomation } from './editor/PercentageAutomation';
import { PercentageAutomationReadOnly } from './editor/PercentageAutomationReadOnly';
import { RefillAutomation } from './editor/RefillAutomation';
import { RefillAutomationReadOnly } from './editor/RefillAutomationReadOnly';
import { RemainderAutomation } from './editor/RemainderAutomation';
import { RemainderAutomationReadOnly } from './editor/RemainderAutomationReadOnly';
import { ScheduleAutomation } from './editor/ScheduleAutomation';
import { ScheduleAutomationReadOnly } from './editor/ScheduleAutomationReadOnly';
import { WeekAutomation } from './editor/WeekAutomation';
import { WeekAutomationReadOnly } from './editor/WeekAutomationReadOnly';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type DisplayTemplateMeta = {
  // Rendered as ReactNode via <Trans> so the i18n extractor can pick up the
  // source strings statically — `t(variable)` would not be extractable.
  label: ReactNode;
  description: ReactNode;
  icon: IconComponent;
};

export const displayTemplateMeta: Record<
  DisplayTemplateType,
  DisplayTemplateMeta
> = {
  week: {
    label: <Trans>Fixed amount</Trans>,
    description: (
      <Trans>Add a set amount every month, week, day, or year.</Trans>
    ),
    icon: SvgPiggyBank,
  },
  schedule: {
    label: <Trans>Cover schedule</Trans>,
    description: <Trans>Save up for a recurring scheduled transaction.</Trans>,
    icon: SvgCalendar3,
  },
  by: {
    label: <Trans>Save by date</Trans>,
    description: (
      <Trans>Spread a target amount across the months until a deadline.</Trans>
    ),
    icon: SvgMoneyBag,
  },
  percentage: {
    label: <Trans>% of income</Trans>,
    description: (
      <Trans>A share of this month&rsquo;s or last month&rsquo;s income.</Trans>
    ),
    icon: SvgChartPie,
  },
  historical: {
    label: <Trans>From history</Trans>,
    description: (
      <Trans>Use past months: average, a specific month, or a copy.</Trans>
    ),
    icon: SvgTime,
  },
  limit: {
    label: <Trans>Balance cap</Trans>,
    description: <Trans>Never let the category balance exceed a cap.</Trans>,
    icon: SvgEquals,
  },
  refill: {
    label: <Trans>Refill to cap</Trans>,
    description: (
      <Trans>Top the category back up to the balance cap each month.</Trans>
    ),
    icon: SvgArrowsSynchronize,
  },
  remainder: {
    label: <Trans>Whatever is left</Trans>,
    description: (
      <Trans>Split any remaining To Budget across these categories.</Trans>
    ),
    icon: SvgShare,
  },
};

type TemplateSentenceProps = {
  template: Template;
  categoryNameMap: Record<string, string>;
};

export function TemplateSentence({
  template,
  categoryNameMap,
}: TemplateSentenceProps) {
  switch (template.type) {
    case 'limit':
      return <LimitAutomationReadOnly template={template} />;
    case 'refill':
      return <RefillAutomationReadOnly />;
    case 'periodic':
      return <WeekAutomationReadOnly template={template} />;
    case 'schedule':
      return <ScheduleAutomationReadOnly template={template} />;
    case 'percentage':
      return (
        <PercentageAutomationReadOnly
          template={template}
          categoryNameMap={categoryNameMap}
        />
      );
    case 'average':
    case 'copy':
      return <HistoricalAutomationReadOnly template={template} />;
    case 'by':
      return <BySaveAutomationReadOnly template={template} />;
    case 'remainder':
      return <RemainderAutomationReadOnly template={template} />;
    case 'simple':
    case 'spend':
    case 'goal':
    case 'error':
      return <Trans>Unsupported template type</Trans>;
    default:
      template satisfies never;
      return null;
  }
}

type ActiveEditorProps = {
  state: ReducerState;
  dispatch: (action: Action) => void;
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  hasLimitAutomation: boolean;
  onAddLimitAutomation: () => void;
};

export function ActiveEditor({
  state,
  dispatch,
  schedules,
  categories,
  hasLimitAutomation,
  onAddLimitAutomation,
}: ActiveEditorProps) {
  switch (state.displayType) {
    case 'limit':
      return <LimitAutomation template={state.template} dispatch={dispatch} />;
    case 'refill':
      return (
        <RefillAutomation
          hasLimitAutomation={hasLimitAutomation}
          onAddLimitAutomation={onAddLimitAutomation}
        />
      );
    case 'week':
      return <WeekAutomation template={state.template} dispatch={dispatch} />;
    case 'schedule':
      return (
        <ScheduleAutomation
          schedules={schedules}
          template={state.template}
          dispatch={dispatch}
        />
      );
    case 'percentage':
      return (
        <PercentageAutomation
          dispatch={dispatch}
          template={state.template}
          categories={categories}
        />
      );
    case 'historical':
      return (
        <HistoricalAutomation template={state.template} dispatch={dispatch} />
      );
    case 'by':
      return <BySaveAutomation template={state.template} dispatch={dispatch} />;
    case 'remainder':
      return (
        <RemainderAutomation template={state.template} dispatch={dispatch} />
      );
    default:
      state satisfies never;
      return null;
  }
}

export type RuleErrorKind =
  | { kind: 'schedule-not-found'; name: string }
  | { kind: 'refill-no-cap' }
  | { kind: 'percentage-out-of-range'; percent: number }
  | { kind: 'percentage-no-source' }
  | { kind: 'percentage-source-not-found'; source: string }
  | { kind: 'by-no-month' }
  | { kind: 'by-target-past'; month: string };

export type GlobalConflictKind =
  | { kind: 'over-income'; total: number; income: number }
  | { kind: 'percent-over-100'; total: number };

// Strict YYYY-MM check: month 01-12 only. Guards downstream date math
// (differenceInCalendarMonths, monthUtils.format) against malformed input
// like "2026-13" or "2026-04-extra" that would otherwise produce NaN.
function isValidYearMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function validateRule(
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
): RuleErrorKind | null {
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
      return null;
    case 'refill':
      if (!allTemplates.some(t => t.type === 'limit')) {
        return { kind: 'refill-no-cap' };
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
      if (template.type !== 'by') return null;
      if (!template.month || !isValidYearMonth(template.month)) {
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
      return null;
    }
    default:
      return null;
  }
}

// Format a YYYY-MM string as "MMM yyyy" using the active locale (matching
// the convention used elsewhere in the codebase via monthUtils.format).
// Falls back to the raw input if it doesn't look like YYYY-MM, and to "—"
// for empty/missing values so callers don't need their own guards.
export function formatMonthLabel(
  month: string | undefined | null,
  locale?: Parameters<typeof monthUtils.format>[2],
): string {
  if (!month) return '—';
  if (!isValidYearMonth(month)) return month;
  return monthUtils.format(`${month}-01`, 'MMM yyyy', locale);
}

export function RuleErrorTitle({ error }: { error: RuleErrorKind }) {
  switch (error.kind) {
    case 'schedule-not-found':
      return <Trans>Schedule not found</Trans>;
    case 'refill-no-cap':
      return <Trans>Refill needs a balance cap</Trans>;
    case 'percentage-out-of-range':
      return <Trans>Percentage out of range</Trans>;
    case 'percentage-no-source':
      return <Trans>Source category missing</Trans>;
    case 'by-no-month':
      return <Trans>Target month missing</Trans>;
    case 'by-target-past':
      return <Trans>Target is in the past</Trans>;
    case 'percentage-source-not-found':
      return <Trans>Source category missing</Trans>;
    default:
      error satisfies never;
      return null;
  }
}

export function RuleErrorShort({ error }: { error: RuleErrorKind }) {
  const locale = useLocale();
  switch (error.kind) {
    case 'schedule-not-found':
      return error.name ? (
        <Trans>No schedule named &ldquo;{{ name: error.name }}&rdquo;</Trans>
      ) : (
        <Trans>Pick a schedule</Trans>
      );
    case 'refill-no-cap':
      return <Trans>Add a balance cap above</Trans>;
    case 'percentage-out-of-range':
      return <Trans>{{ percent: error.percent }}% is outside 1–100</Trans>;
    case 'percentage-no-source':
      return <Trans>Pick a source category</Trans>;
    case 'by-no-month':
      return <Trans>Pick a target month</Trans>;
    case 'by-target-past':
      return (
        <Trans>
          {{ month: formatMonthLabel(error.month, locale) }} has already passed
        </Trans>
      );
    case 'percentage-source-not-found':
      return <Trans>Pick a valid income category</Trans>;
    default:
      error satisfies never;
      return null;
  }
}

export function RuleErrorDetail({ error }: { error: RuleErrorKind }) {
  switch (error.kind) {
    case 'schedule-not-found':
      return (
        <Trans>
          Pick an existing schedule, or create one in Schedules. This rule
          can&rsquo;t run until it&rsquo;s linked to a schedule.
        </Trans>
      );
    case 'refill-no-cap':
      return (
        <Trans>
          A refill rule tops the category up to a cap each month. Add a
          &ldquo;Balance cap&rdquo; rule first so this one knows the target.
        </Trans>
      );
    case 'percentage-out-of-range':
      return <Trans>Set a value between 1% and 100%.</Trans>;
    case 'percentage-no-source':
      return (
        <Trans>
          Percentage rules need a source category to calculate against.
        </Trans>
      );
    case 'by-no-month':
      return (
        <Trans>
          Goals by date need a target month. Pick when you want this fully
          funded.
        </Trans>
      );
    case 'by-target-past':
      return (
        <Trans>
          Pick a future month, or switch to a recurring annual goal to keep
          saving.
        </Trans>
      );
    case 'percentage-source-not-found':
      return (
        <Trans>
          The selected source &ldquo;{{ source: error.source }}&rdquo; is not a
          known income category.
        </Trans>
      );
    default:
      error satisfies never;
      return null;
  }
}

export function GlobalConflictTitle({
  conflict,
}: {
  conflict: GlobalConflictKind;
}) {
  switch (conflict.kind) {
    case 'over-income':
      return <Trans>Rules will demand more than income</Trans>;
    case 'percent-over-100':
      return (
        <Trans>
          Percent rules total {{ total: Math.round(conflict.total) }}% of income
        </Trans>
      );
    default:
      conflict satisfies never;
      return null;
  }
}

export function GlobalConflictDetail({
  conflict,
}: {
  conflict: GlobalConflictKind;
}) {
  const format = useFormat();
  switch (conflict.kind) {
    case 'over-income':
      return (
        <Trans>
          This month&rsquo;s rules ask for around{' '}
          {{ total: format(conflict.total, 'financial') }} but only{' '}
          {{ income: format(conflict.income, 'financial') }} comes in. Lower
          amounts or switch one to &ldquo;Whatever is left&rdquo;.
        </Trans>
      );
    case 'percent-over-100':
      return (
        <Trans>
          Multiple percent-of-income rules add up to more than 100%. The engine
          will clip; lower the percentages or combine them.
        </Trans>
      );
    default:
      conflict satisfies never;
      return null;
  }
}
