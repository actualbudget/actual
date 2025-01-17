import React from 'react';
import { useTranslation } from 'react-i18next';

import { ManageRules } from './ManageRules';
import { Page } from './Page';

export function ManageRulesPage() {
  const { t } = useTranslation();
  return (
    <Page header={t('Rules')}>
      <ManageRules isModal={false} payeeId={null} />
    </Page>
  );
}
