import { Trans } from 'react-i18next';

import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

import { formatMonthLabel } from './formatMonthLabel';
import type {
  AutomationErrorKind,
  GlobalConflictKind,
} from './validateAutomation';

export function AutomationErrorTitle({
  error,
}: {
  error: AutomationErrorKind;
}) {
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
      return <Trans>Source category not recognised</Trans>;
    default:
      error satisfies never;
      return null;
  }
}

export function AutomationErrorShort({
  error,
}: {
  error: AutomationErrorKind;
}) {
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
      return (
        <Trans>{{ percent: error.percent }}% must be between 0 and 100</Trans>
      );
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

export function AutomationErrorDetail({
  error,
}: {
  error: AutomationErrorKind;
}) {
  switch (error.kind) {
    case 'schedule-not-found':
      return (
        <Trans>
          Pick an existing schedule, or create one in Schedules. This automation
          can&rsquo;t run until it&rsquo;s linked to a schedule.
        </Trans>
      );
    case 'refill-no-cap':
      return (
        <Trans>
          Refill automations must have a &ldquo;Balance cap&rdquo; automation
          added to use as the target.
        </Trans>
      );
    case 'percentage-out-of-range':
      return <Trans>Set a value greater than 0% and at most 100%.</Trans>;
    case 'percentage-no-source':
      return (
        <Trans>
          Percentage automations need a source category to calculate against.
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
      return <Trans>Automations will demand more than income</Trans>;
    case 'percent-over-100':
      return (
        <Trans>
          Percent automations total {{ total: Math.round(conflict.total) }}% of
          income
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
          This month&rsquo;s automations ask for around{' '}
          {{ total: format(conflict.total, 'financial') }} but only{' '}
          {{ income: format(conflict.income, 'financial') }} is available to
          budget. Lower amounts or switch one to &ldquo;Whatever is left&rdquo;.
        </Trans>
      );
    case 'percent-over-100':
      return (
        <Trans>
          Your percent automations add up to more than 100% and will be capped
          at 100%.
        </Trans>
      );
    default:
      conflict satisfies never;
      return null;
  }
}
