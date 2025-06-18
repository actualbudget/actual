import { Trans } from 'react-i18next';

import type { WeekTemplate } from 'loot-core/types/models/templates';

import { useFormat } from '@desktop-client/hooks/useFormat';

type WeekAutomationReadOnlyProps = {
  template: WeekTemplate;
};

export const WeekAutomationReadOnly = ({
  template,
}: WeekAutomationReadOnlyProps) => {
  const format = useFormat();
  return (
    <Trans>
      Budget {{ amount: format(template.amount, 'financial') }} each week
    </Trans>
  );
};
