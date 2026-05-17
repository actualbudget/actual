import { Trans } from 'react-i18next';

import { amountToInteger } from '@actual-app/core/shared/util';
import type { LimitTemplate } from '@actual-app/core/types/models/templates';

import { useFormat } from '#hooks/useFormat';

type LimitAutomationShortProps = {
  template: LimitTemplate;
};

export const LimitAutomationShort = ({
  template,
}: LimitAutomationShortProps) => {
  const format = useFormat();
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );

  switch (template.period) {
    case 'daily':
      return <Trans>{{ amount }} / day</Trans>;
    case 'weekly':
      return <Trans>{{ amount }} / week</Trans>;
    case 'monthly':
      return <Trans>{{ amount }} / month</Trans>;
    default:
      return null;
  }
};
