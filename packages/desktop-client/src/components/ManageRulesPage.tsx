import React from 'react';

import { t } from 'i18next';

import { ManageRules } from './ManageRules';
import { Page } from './Page';

export function ManageRulesPage() {
  return (
    <Page header={t('Rules')}>
      <ManageRules isModal={false} payeeId={null} />
    </Page>
  );
}
