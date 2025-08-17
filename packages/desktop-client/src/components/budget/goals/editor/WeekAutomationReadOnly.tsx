import { Trans } from 'react-i18next';

import { amountToInteger } from 'loot-core/shared/util';
import type { PeriodicTemplate } from 'loot-core/types/models/templates';

import { useFormat } from '@desktop-client/hooks/useFormat';

type WeekAutomationReadOnlyProps = {
  template: PeriodicTemplate;
};

export const WeekAutomationReadOnly = ({
  template,
}: WeekAutomationReadOnlyProps) => {
  const format = useFormat();

  return (
    <Trans>
      Budget{' '}
      {{
        amount: format(
          amountToInteger(template.amount, format.currency.decimalPlaces),
          'financial',
        ),
      }}{' '}
      each week
    </Trans>
  );
};
