import { Trans } from 'react-i18next';

import type { PeriodicTemplate } from '@actual-app/core/types/models/templates';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';

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
      <FinancialText>
        {
          {
            amount: format(template.amount, 'financial'),
          } as TransObjectLiteral
        }
      </FinancialText>{' '}
      each week
    </Trans>
  );
};
