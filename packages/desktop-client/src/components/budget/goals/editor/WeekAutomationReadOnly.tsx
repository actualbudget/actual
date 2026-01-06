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

  // Template amounts are stored as dollars (floats) by the parser,
  // convert to cents (integers) for display
  const amountInCents = amountToInteger(template.amount ?? 0);

  return (
    <Trans>
      Budget{' '}
      {{
        amount: format(amountInCents, 'financial'),
      }}{' '}
      each week
    </Trans>
  );
};
