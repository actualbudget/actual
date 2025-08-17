import { Trans } from 'react-i18next';

import { amountToInteger } from 'loot-core/shared/util';
import type { SimpleTemplate } from 'loot-core/types/models/templates';

import { useFormat } from '@desktop-client/hooks/useFormat';

type SimpleAutomationReadOnlyProps = {
  template: SimpleTemplate;
};

export const SimpleAutomationReadOnly = ({
  template,
}: SimpleAutomationReadOnlyProps) => {
  const format = useFormat();
  return (
    <Trans>
      Budget{' '}
      {{
        monthly: format(
          amountToInteger(template.monthly ?? 0, format.currency.decimalPlaces),
          'financial',
        ),
      }}{' '}
      each month
    </Trans>
  );
};
