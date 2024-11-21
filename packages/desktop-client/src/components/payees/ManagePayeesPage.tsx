import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { type PayeeEntity } from 'loot-core/types/models';

import { Page } from '../Page';

import { ManagePayeesWithData } from './ManagePayeesWithData';

export function ManagePayeesPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const locationState = location.state;
  const initialSelectedIds =
    locationState && 'selectedPayee' in locationState
      ? [locationState.selectedPayee as PayeeEntity['id']]
      : [];
  return (
    <Page header={t('Payees')}>
      <ManagePayeesWithData initialSelectedIds={initialSelectedIds} />
    </Page>
  );
}
