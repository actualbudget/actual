import { Trans } from 'react-i18next';

import { amountToInteger } from '@actual-app/core/shared/util';
import type {
  ByTemplate,
  SpendTemplate,
} from '@actual-app/core/types/models/templates';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { formatMonthLabel } from '#components/budget/goals/formatMonthLabel';
import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type BySaveAutomationReadOnlyProps = {
  template: ByTemplate | SpendTemplate;
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
  const from =
    template.type === 'spend' ? formatMonthLabel(template.from, locale) : null;

  if (template.annual) {
    if (from) {
      return (
        <Trans count={repeat}>
          Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          by {{ month }}, early spending from {{ from }}, repeating every{' '}
          {{ count: repeat }} years
        </Trans>
      );
    }
    return (
      <Trans count={repeat}>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, repeating every {{ count: repeat }} years
      </Trans>
    );
  }

  if (template.repeat && template.repeat > 0) {
    if (from) {
      return (
        <Trans count={repeat}>
          Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          by {{ month }}, early spending from {{ from }}, repeating every{' '}
          {{ count: repeat }} months
        </Trans>
      );
    }
    return (
      <Trans count={repeat}>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, repeating every {{ count: repeat }} months
      </Trans>
    );
  }

  if (from) {
    return (
      <Trans>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, early spending from {{ from }}
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
