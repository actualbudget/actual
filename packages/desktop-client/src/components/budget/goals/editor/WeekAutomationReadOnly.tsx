import { Trans } from 'react-i18next';

import { amountToInteger } from 'loot-core/shared/util';
import type { PeriodicTemplate } from 'loot-core/types/models/templates';

import { useFormat } from '@desktop-client/hooks/useFormat';

type WeekAutomationReadOnlyProps = {
  template: PeriodicTemplate;
};

function getPeriodText(period: PeriodicTemplate['period']): string {
  const { period: periodType, amount } = period;

  // Handle null/undefined/1 as singular
  if (!amount || amount === 1) {
    // Singular: "every day", "every week", "every month", "every year"
    return periodType;
  }

  // Plural: "2 days", "2 weeks", "3 months", "2 years"
  return `${amount} ${periodType}s`;
}

export const WeekAutomationReadOnly = ({
  template,
}: WeekAutomationReadOnlyProps) => {
  const format = useFormat();

  // Template amounts are stored as dollars (floats) by the parser,
  // convert to cents (integers) using currency-aware conversion
  const amountInCents = amountToInteger(
    template.amount ?? 0,
    format.currency.decimalPlaces,
  );
  const periodText = getPeriodText(template.period);

  return (
    <Trans>
      Budget{' '}
      {{
        amount: format(amountInCents, 'financial'),
      }}{' '}
      every {{ period: periodText }}
    </Trans>
  );
};
