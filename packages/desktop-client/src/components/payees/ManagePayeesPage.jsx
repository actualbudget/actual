import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { Page } from '../Page';

import { ManagePayeesWithData } from './ManagePayeesWithData';

export function ManagePayeesPage() {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <Page header={t('Payees')}>
      <ManagePayeesWithData
        initialSelectedIds={
          location.state && location.state.selectedPayee
            ? [location.state.selectedPayee]
            : null
        }
      />
    </Page>
  );
}
