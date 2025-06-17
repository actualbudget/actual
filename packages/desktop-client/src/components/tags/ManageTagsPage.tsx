import React from 'react';
import { useTranslation } from 'react-i18next';

import { ManageTags } from './ManageTags';

import { Page } from '@desktop-client/components/Page';

export const ManageTagsPage = () => {
  const { t } = useTranslation();

  return (
    <Page header={t('Tags')}>
      <ManageTags />
    </Page>
  );
};
