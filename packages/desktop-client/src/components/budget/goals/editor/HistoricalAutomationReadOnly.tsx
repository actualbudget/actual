import { Trans } from 'react-i18next';

import type {
  AverageTemplate,
  CopyTemplate,
} from '@actual-app/core/types/models/templates';

type HistoricalAutomationReadOnlyProps = {
  template: CopyTemplate | AverageTemplate;
};

export const HistoricalAutomationReadOnly = ({
  template,
}: HistoricalAutomationReadOnlyProps) => {
  return template.type === 'copy' ? (
    <Trans count={template.lookBack}>
      Budget the same amount as {{ count: template.lookBack }} months ago
    </Trans>
  ) : (
    <Trans count={template.numMonths}>
      Budget the average of the last {{ count: template.numMonths }} months
    </Trans>
  );
};
