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

  // Template amounts are stored as dollars (floats) by the parser,
  // convert to cents (integers) using currency-aware conversion
  const amountInCents = amountToInteger(
    template.monthly ?? 0,
    format.currency.decimalPlaces,
  );

  return (
    <Trans>
      Budget{' '}
      {{
        monthly: format(amountInCents, 'financial'),
      }}{' '}
      each month
    </Trans>
  );
};
