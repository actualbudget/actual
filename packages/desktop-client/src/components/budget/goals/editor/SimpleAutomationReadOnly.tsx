import { Trans } from 'react-i18next';

import { integerToCurrency } from 'loot-core/shared/util';
import type { SimpleTemplate } from 'loot-core/types/models/templates';

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
