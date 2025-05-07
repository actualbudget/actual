import React from 'react';
import { useTranslation } from 'react-i18next';

import { ManageRules } from '@desktop-client/components/ManageRules';
import { Page } from '@desktop-client/components/Page';

export function ManageRulesPage() {
  const { t } = useTranslation();
  return (
    <Page header={t('Rules')}>
      <ManageRules isModal={false} payeeId={null} />
    </Page>
  );
}
