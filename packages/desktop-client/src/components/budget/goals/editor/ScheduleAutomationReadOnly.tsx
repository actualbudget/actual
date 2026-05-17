import { Trans } from 'react-i18next';

import type { ScheduleTemplate } from '@actual-app/core/types/models/templates';

import { AmountAdjustmentSummary } from './AmountAdjustmentSummary';

type ScheduleAutomationReadOnlyProps = {
  template: ScheduleTemplate;
};

export const ScheduleAutomationReadOnly = ({
  template,
}: ScheduleAutomationReadOnlyProps) => {
  if (!template.name) {
    return <Trans>Budget for a schedule</Trans>;
  }

  const base = template.full ? (
    <Trans>
      Cover the occurrences of the schedule &lsquo;
      {{ name: template.name }}
      &rsquo; this month
    </Trans>
  ) : (
    <Trans>
      Save up for the schedule &lsquo;
      {{ name: template.name }}
      &rsquo;
    </Trans>
  );

  if (template.adjustment === undefined) {
    return base;
  }

  return (
    <>
      {base} <AmountAdjustmentSummary template={template} />
    </>
  );
};
