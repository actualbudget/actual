import { Trans } from 'react-i18next';

import { amountToInteger } from 'loot-core/shared/util';
import type { LimitTemplate } from 'loot-core/types/models/templates';

import { useFormat } from '@desktop-client/hooks/useFormat';

type LimitAutomationReadOnlyProps = {
  template: LimitTemplate;
};

export const LimitAutomationReadOnly = ({
  template,
}: LimitAutomationReadOnlyProps) => {
  const format = useFormat();

  const period = template.period;
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );
  const hold = template.hold;

  switch (period) {
    case 'daily':
      return hold ? (
        <Trans>Set a balance limit of {{ daily: amount }}/day (soft cap)</Trans>
      ) : (
        <Trans>Set a balance limit of {{ daily: amount }}/day (hard cap)</Trans>
      );
    case 'weekly':
      return hold ? (
        <Trans>
          Set a balance limit of {{ weekly: amount }}/week (soft cap)
        </Trans>
      ) : (
        <Trans>
          Set a balance limit of {{ weekly: amount }}/week (hard cap)
        </Trans>
      );
    case 'monthly':
      return hold ? (
        <Trans>
          Set a balance limit of {{ monthly: amount }}/month (soft cap)
        </Trans>
      ) : (
        <Trans>
          Set a balance limit of {{ monthly: amount }}/month (hard cap)
        </Trans>
      );
    default:
      return null;
  }
};
