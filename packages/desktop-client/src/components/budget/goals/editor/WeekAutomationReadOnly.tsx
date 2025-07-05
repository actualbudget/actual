import { Trans } from 'react-i18next';

import { integerToCurrency } from 'loot-core/shared/util';
import type { PeriodicTemplate } from 'loot-core/types/models/templates';

type WeekAutomationReadOnlyProps = {
  template: PeriodicTemplate;
};

export const WeekAutomationReadOnly = ({
  template,
}: WeekAutomationReadOnlyProps) => {
  return (
    <Trans>
      Budget {{ amount: integerToCurrency(template.amount) }} each week
    </Trans>
  );
};
