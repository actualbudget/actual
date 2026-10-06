import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import type { PayeeEntity } from '@actual-app/core/types/models';

import { Page } from '#components/Page';
import { useIsSettingsSubPage } from '#components/settings/SettingsSubPageContext';

import { ManagePayeesWithData } from './ManagePayeesWithData';

export function ManagePayeesPage() {
  const isSettingsSubPage = useIsSettingsSubPage();
  const { t } = useTranslation();
  const location = useLocation();
  const locationState = location.state;
  const initialSelectedIds =
    locationState && 'selectedPayee' in locationState
      ? [locationState.selectedPayee as PayeeEntity['id']]
      : [];
  return (
    <Page
      header={isSettingsSubPage ? null : t('Payees')}
      padding={isSettingsSubPage ? 0 : undefined}
    >
      <ManagePayeesWithData initialSelectedIds={initialSelectedIds} />
    </Page>
  );
}
