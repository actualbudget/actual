import type { ComponentType, SVGProps } from 'react';
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
import {
  differenceInCalendarMonths,
  monthFromDate,
} from '@actual-app/core/shared/months';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { Template } from '@actual-app/core/types/models/templates';

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
  label: string;
  description: string;
  icon: IconComponent;
};

// Picker tile metadata. `label` and `description` are passed through `t()` at
// the call-site so they remain translatable.
export const displayTemplateMeta: Record<
  DisplayTemplateType,
  DisplayTemplateMeta
> = {
  week: {
    label: 'Fixed amount',
    description: 'Add a set amount every month, week, day, or year.',
    icon: SvgPiggyBank,
  },
  schedule: {
    label: 'Cover schedule',
    description: 'Save up for a recurring scheduled transaction.',
    icon: SvgCalendar3,
  },
  by: {
    label: 'Save by date',
    description: 'Spread a target amount across the months until a deadline.',
    icon: SvgMoneyBag,
  },
  percentage: {
    label: '% of income',
    description: "A share of this month's or last month's income.",
    icon: SvgChartPie,
  },
  historical: {
    label: 'From history',
    description: 'Use past months: average, a specific month, or a copy.',
    icon: SvgTime,
  },
  limit: {
    label: 'Balance cap',
    description: 'Never let the category balance exceed a cap.',
    icon: SvgEquals,
  },
  refill: {
    label: 'Refill to cap',
    description: 'Top the category back up to the balance cap each month.',
    icon: SvgArrowsSynchronize,
  },
  remainder: {
    label: 'Whatever is left',
    description: 'Split any remaining To Budget across these categories.',
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
  | { kind: 'by-no-month' }
  | { kind: 'by-target-past'; month: string };

export type GlobalConflictKind =
  | { kind: 'over-income'; total: number; income: number }
  | { kind: 'percent-over-100'; total: number };

export function validateRule(
  template: Template,
  displayType: DisplayTemplateType,
  allTemplates: readonly Template[],
  schedules: readonly ScheduleEntity[],
  today: Date,
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
      return null;
    case 'by': {
      if (template.type !== 'by') return null;
      if (!template.month) return { kind: 'by-no-month' };
      const targetMonth = template.month;
      const startOfTodayMonth = monthFromDate(today);
      const monthsRemaining = differenceInCalendarMonths(
        targetMonth + '-01',
        startOfTodayMonth + '-01',
      );
      if (monthsRemaining < 0) {
        return { kind: 'by-target-past', month: targetMonth };
      }
      return null;
    }
    default:
      return null;
  }
}

function formatTargetMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(month);
  if (!match) return month;
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${names[Number(match[2]) - 1]} ${match[1]}`;
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
    default:
      return null;
  }
}

export function RuleErrorShort({ error }: { error: RuleErrorKind }) {
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
          {{ month: formatTargetMonth(error.month) }} has already passed
        </Trans>
      );
    default:
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
    default:
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
          Percent rules total {{ total: conflict.total }}% of income
        </Trans>
      );
    default:
      return null;
  }
}

export function GlobalConflictDetail({
  conflict,
}: {
  conflict: GlobalConflictKind;
}) {
  switch (conflict.kind) {
    case 'over-income':
      return (
        <Trans>
          This month&rsquo;s rules ask for around{' '}
          {{ total: Math.round(conflict.total) }} but only{' '}
          {{ income: Math.round(conflict.income) }} comes in. Lower amounts or
          switch one to &ldquo;Whatever is left&rdquo;.
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
      return null;
  }
}
