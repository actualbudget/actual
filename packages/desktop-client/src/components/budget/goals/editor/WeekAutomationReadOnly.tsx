import { Trans } from 'react-i18next';

import type { PeriodicTemplate } from 'loot-core/types/models/templates';
import { type TransObjectLiteral } from 'loot-core/types/util';

import { TNum } from '@desktop-client/components/TNum';
import { useFormat } from '@desktop-client/hooks/useFormat';

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
      <TNum>
        {
          {
            amount: format(template.amount, 'financial'),
          } as TransObjectLiteral
        }
      </TNum>{' '}
      each week
    </Trans>
  );
};
