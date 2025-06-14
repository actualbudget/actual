import { Trans } from 'react-i18next';

import type {
  CopyTemplate,
  AverageTemplate,
} from 'loot-core/types/models/templates';

type HistoricalAutomationReadOnlyProps = {
  template: CopyTemplate | AverageTemplate;
};

export const HistoricalAutomationReadOnly = ({
  template,
}: HistoricalAutomationReadOnlyProps) => {
  return template.type === 'copy' ? (
    <Trans>
      Budget the same amount as {{ amount: template.lookBack }} months ago
    </Trans>
  ) : (
    <Trans>
      Budget the average of the last {{ amount: template.numMonths }} months
    </Trans>
  );
};
