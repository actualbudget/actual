import { Trans } from 'react-i18next';

import type { WeekTemplate } from 'loot-core/server/budget/types/templates';
import { integerToCurrency } from 'loot-core/shared/util';

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
