import { Trans } from 'react-i18next';

import { integerToCurrency } from 'loot-core/shared/util';
import type { WeekTemplate } from 'loot-core/types/models/templates';

type WeekAutomationReadOnlyProps = {
  template: WeekTemplate;
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
