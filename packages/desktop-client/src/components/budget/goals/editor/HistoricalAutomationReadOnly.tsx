import { Trans } from 'react-i18next';

import { WEEKDAYS } from '@actual-app/core/shared/months';
import type {
  AverageTemplate,
  CopyTemplate,
  WeeklyAverageTemplate,
} from '@actual-app/core/types/models/templates';

import { useDaysOfWeek } from '#hooks/useDaysOfWeek';

import { AmountAdjustmentSummary } from './AmountAdjustmentSummary';

type HistoricalAutomationReadOnlyProps = {
  template: CopyTemplate | AverageTemplate | WeeklyAverageTemplate;
};

export const HistoricalAutomationReadOnly = ({
  template,
}: HistoricalAutomationReadOnlyProps) => {
  if (template.type === 'copy') {
    return (
      <Trans count={template.lookBack}>
        Budget the same amount as {{ count: template.lookBack }} months ago
      </Trans>
    );
  }

  const base =
    template.type === 'weeklyAverage' ? (
      <WeeklyAverageSentence template={template} />
    ) : (
      <Trans count={template.numMonths}>
        Budget the average of the last {{ count: template.numMonths }} complete
        months
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

function WeeklyAverageSentence({
  template,
}: {
  template: WeeklyAverageTemplate;
}) {
  const daysOfWeek = useDaysOfWeek();
  const weekday = daysOfWeek[WEEKDAYS.indexOf(template.weekday)];

  return (
    <Trans count={template.numWeeks}>
      Budget the weekly average of the last {{ count: template.numWeeks }}{' '}
      complete weeks for every {{ weekday }} in the month
    </Trans>
  );
}
