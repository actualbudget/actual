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

  if (periodAmount === 1) {
    switch (periodUnit) {
      case 'day':
        return (
          <Trans>
            Budget{' '}
            <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
            each day
          </Trans>
        );
      case 'week':
        return (
          <Trans>
            Budget{' '}
            <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
            each week
          </Trans>
        );
      case 'month':
        return (
          <Trans>
            Budget{' '}
            <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
            each month
          </Trans>
        );
      case 'year':
        return (
          <Trans>
            Budget{' '}
            <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
            each year
          </Trans>
        );
      default:
        return null;
    }
  }

  switch (periodUnit) {
    case 'day':
      return (
        <Trans>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ periodAmount }} days
        </Trans>
      );
    case 'week':
      return (
        <Trans>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ periodAmount }} weeks
        </Trans>
      );
    case 'month':
      return (
        <Trans>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ periodAmount }} months
        </Trans>
      );
    case 'year':
      return (
        <Trans>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ periodAmount }} years
        </Trans>
      );
    default:
      return null;
  }
}
