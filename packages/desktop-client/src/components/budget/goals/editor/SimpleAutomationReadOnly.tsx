import { Trans } from 'react-i18next';

import type { SimpleTemplate } from 'loot-core/types/models/templates';
import type { TransObjectLiteral } from 'loot-core/types/util';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { useFormat } from '@desktop-client/hooks/useFormat';

type SimpleAutomationReadOnlyProps = {
  template: SimpleTemplate;
};

export const SimpleAutomationReadOnly = ({
  template,
}: SimpleAutomationReadOnlyProps) => {
  const format = useFormat();
  return (
    <Trans>
      Budget{' '}
      <FinancialText>
        {
          {
            amount: format(template.monthly ?? 0, 'financial'),
          } as TransObjectLiteral
        }
      </FinancialText>{' '}
      each month
    </Trans>
  );
};
