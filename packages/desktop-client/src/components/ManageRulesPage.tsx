import React from 'react';

import { ManageRules } from './ManageRules';
import { Page } from './Page';

export function ManageRulesPage() {
  return (
    <Page header="Rules">
      <ManageRules isModal={false} payeeId={null} />
    </Page>
  );
}
