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
    case 'limit-no-contributor':
      return <Trans>Balance cap needs a contributing automation</Trans>;
    case 'percentage-out-of-range':
      return <Trans>Percentage out of range</Trans>;
    case 'percentage-no-source':
      return <Trans>Source category missing</Trans>;
    case 'by-no-month':
      return <Trans>Target month missing</Trans>;
    case 'by-target-past':
      return <Trans>Target is in the past</Trans>;
    case 'spend-no-from':
      return <Trans>Early-spending month missing</Trans>;
    case 'spend-from-after-target':
      return <Trans>Early spending starts after target</Trans>;
    case 'percentage-source-not-found':
      return <Trans>Source category not recognised</Trans>;
    case 'adjustment-out-of-range':
      return <Trans>Adjustment out of range</Trans>;
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
      return <Trans>Add a balance cap</Trans>;
    case 'limit-no-contributor':
      return <Trans>Add an automation that contributes funds</Trans>;
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
    case 'spend-no-from':
      return <Trans>Pick an early-spending start month</Trans>;
    case 'spend-from-after-target':
      return <Trans>Early spending must start before the target</Trans>;
    case 'percentage-source-not-found':
      return <Trans>Pick a valid income category</Trans>;
    case 'adjustment-out-of-range':
      return <Trans>Adjustment out of range</Trans>;
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
    case 'limit-no-contributor':
      return (
        <Trans>
          A balance cap on its own does nothing. Add a contributing automation
          (such as a fixed amount, save by date, or whatever is left) so the cap
          has something to clamp.
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
    case 'spend-no-from':
      return (
        <Trans>
          Early-spending templates need a start month. Pick when you want
          spending to begin.
        </Trans>
      );
    case 'spend-from-after-target':
      return (
        <Trans>
          The early-spending month must be the same as or earlier than the
          target month, since it marks when spending begins.
        </Trans>
      );
    case 'percentage-source-not-found':
      return (
        <Trans>
          The selected source &ldquo;{{ source: error.source }}&rdquo; is not a
          known income category.
        </Trans>
      );
    case 'adjustment-out-of-range':
      return (
        <Trans>
          A percentage decrease must be under 100% and an increase at most
          1000%.
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
    case 'schedule-priority-mismatch':
      return (
        <Trans>
          All cover schedule and save by date automations must use the same
          priority
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
    case 'schedule-priority-mismatch':
      return null;
    default:
      conflict satisfies never;
      return null;
  }
}
