import { Trans } from 'react-i18next';

import { amountToInteger } from '@actual-app/core/shared/util';
import type { ByTemplate } from '@actual-app/core/types/models/templates';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';

type BySaveAutomationReadOnlyProps = {
  template: ByTemplate;
};

function formatTargetMonth(month: string | undefined): string {
  if (!month) return '—';
  const match = /^(\d{4})-(\d{2})/.exec(month);
  if (!match) return month;
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${names[Number(match[2]) - 1]} ${match[1]}`;
}

export const BySaveAutomationReadOnly = ({
  template,
}: BySaveAutomationReadOnlyProps) => {
  const format = useFormat();
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );
  const month = formatTargetMonth(template.month);
  const repeat = template.repeat ?? 1;

  if (template.annual) {
    return (
      <Trans>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, repeating every {{ years: repeat }} year(s)
      </Trans>
    );
  }

  if (template.repeat && template.repeat > 0) {
    return (
      <Trans>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, repeating every {{ months: repeat }} month(s)
      </Trans>
    );
  }

  return (
    <Trans>
      Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText> by{' '}
      {{ month }}
    </Trans>
  );
};
