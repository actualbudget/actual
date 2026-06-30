import { Trans } from 'react-i18next';

import { amountToInteger } from '@actual-app/core/shared/util';
import type { PeriodicTemplate } from '@actual-app/core/types/models/templates';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';

type FixedAutomationReadOnlyProps = {
  template: PeriodicTemplate;
};

export function FixedAutomationReadOnly({
  template,
}: FixedAutomationReadOnlyProps) {
  const format = useFormat();
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );
  const periodAmount = template.period?.amount ?? 1;
  const periodUnit = template.period?.period ?? 'month';

  switch (periodUnit) {
    case 'day':
      return (
        <Trans count={periodAmount}>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ count: periodAmount }} days
        </Trans>
      );
    case 'week':
      return (
        <Trans count={periodAmount}>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ count: periodAmount }} weeks
        </Trans>
      );
    case 'month':
      return (
        <Trans count={periodAmount}>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ count: periodAmount }} months
        </Trans>
      );
    case 'year':
      return (
        <Trans count={periodAmount}>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ count: periodAmount }} years
        </Trans>
      );
    default:
      return null;
  }
}
