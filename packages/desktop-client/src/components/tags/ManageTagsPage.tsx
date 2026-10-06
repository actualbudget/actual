import React from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { Page } from '#components/Page';

import { ManageTags } from './ManageTags';

export const ManageTagsPage = () => {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  if (!isNarrowWidth) {
    return <ManageTags />;
  }

  return (
    <Page header={t('Tags')}>
      <ManageTags />
    </Page>
  );
};
