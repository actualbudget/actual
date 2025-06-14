import { Trans } from 'react-i18next';

import type { SimpleTemplate } from 'loot-core/server/budget/types/templates';

import { useFormat } from '@desktop-client/components/spreadsheet/useFormat';

type SimpleAutomationReadOnlyProps = {
  template: SimpleTemplate;
};

export const SimpleAutomationReadOnly = ({
  template,
}: SimpleAutomationReadOnlyProps) => {
  const format = useFormat();
  return (
    <Trans>
      Budget {{ monthly: format(template.monthly ?? 0, 'financial') }} each
      month
    </Trans>
  );
};
