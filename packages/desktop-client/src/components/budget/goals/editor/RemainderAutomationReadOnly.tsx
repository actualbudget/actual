import { Trans } from 'react-i18next';

import type { RemainderTemplate } from '@actual-app/core/types/models/templates';

type RemainderAutomationReadOnlyProps = {
  template: RemainderTemplate;
};

export const RemainderAutomationReadOnly = ({
  template,
}: RemainderAutomationReadOnlyProps) => {
  return (
    <Trans>
      Share remaining funds to budget (weight {{ weight: template.weight ?? 1 }}
      )
    </Trans>
  );
};
