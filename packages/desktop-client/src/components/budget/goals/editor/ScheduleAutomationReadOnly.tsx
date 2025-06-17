import { Trans } from 'react-i18next';

import type { ScheduleTemplate } from 'loot-core/types/models/templates';

type ScheduleAutomationReadOnlyProps = {
  template: ScheduleTemplate;
};

export const ScheduleAutomationReadOnly = ({
  template,
}: ScheduleAutomationReadOnlyProps) => {
  if (!template.name) {
    return <Trans>Budget for a schedule</Trans>;
  }

  if (template.full) {
    return (
      <Trans>
        Cover the occurrences of the schedule &lsquo;
        {{ name: template.name }}
        &rsquo; this month
      </Trans>
    );
  }

  return (
    <Trans>
      Save up for the schedule &lsquo;
      {{ name: template.name }}
      &rsquo;
    </Trans>
  );
};
