import React from 'react';
import { useTranslation } from 'react-i18next';

import { ManagePeople } from './ManagePeople';

import { Page } from '@desktop-client/components/Page';

export const ManagePeoplePage = () => {
  const { t } = useTranslation();

  return (
    <Page header={t('People')}>
      <ManagePeople />
    </Page>
  );
};
