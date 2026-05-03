import { Trans } from 'react-i18next';

import { amountToInteger } from '@actual-app/core/shared/util';
import type { ByTemplate } from '@actual-app/core/types/models/templates';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { formatMonthLabel } from '#components/budget/goals/formatMonthLabel';
import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type BySaveAutomationReadOnlyProps = {
  template: ByTemplate;
};

export const BySaveAutomationReadOnly = ({
  template,
}: BySaveAutomationReadOnlyProps) => {
  const format = useFormat();
  const locale = useLocale();
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );
  const month = formatMonthLabel(template.month, locale);
  const repeat = template.repeat ?? 1;

  if (template.annual) {
    return (
      <Trans count={repeat}>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, repeating every {{ count: repeat }} years
      </Trans>
    );
  }

  if (template.repeat && template.repeat > 0) {
    return (
      <Trans count={repeat}>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, repeating every {{ count: repeat }} months
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
