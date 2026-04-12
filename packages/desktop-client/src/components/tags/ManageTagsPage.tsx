import React from 'react';
import { useTranslation } from 'react-i18next';

import { Page } from '#components/Page';

import { ManageTags } from './ManageTags';

export const ManageTagsPage = () => {
  const { t } = useTranslation();

  return (
    <Page header={t('Tags')}>
      <ManageTags />
    </Page>
  );
};
