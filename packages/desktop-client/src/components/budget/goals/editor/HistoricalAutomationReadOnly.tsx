import { Trans } from 'react-i18next';

import type {
  AverageTemplate,
  CopyTemplate,
} from '@actual-app/core/types/models/templates';

import { AmountAdjustmentSummary } from './AmountAdjustmentSummary';

type HistoricalAutomationReadOnlyProps = {
  template: CopyTemplate | AverageTemplate;
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

  const base = (
    <Trans count={template.numMonths}>
      Budget the average of the last {{ count: template.numMonths }} months
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
