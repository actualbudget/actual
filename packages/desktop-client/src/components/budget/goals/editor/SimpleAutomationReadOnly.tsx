import { Trans } from 'react-i18next';

import type { SimpleTemplate } from 'loot-core/server/budget/types/templates';
import { integerToCurrency } from 'loot-core/shared/util';

type SimpleAutomationReadOnlyProps = {
  template: SimpleTemplate;
};

export const SimpleAutomationReadOnly = ({
  template,
}: SimpleAutomationReadOnlyProps) => {
  return (
    <Trans>
      Budget {{ monthly: integerToCurrency(template.monthly ?? 0) }} each month
    </Trans>
  );
};
