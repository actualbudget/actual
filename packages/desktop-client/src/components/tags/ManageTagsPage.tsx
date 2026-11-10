import React from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { MobilePageHeader, Page } from '#components/Page';
import { SettingsBackButton } from '#components/settings/SettingsBackButton';

import { ManageTags } from './ManageTags';

export const ManageTagsPage = () => {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  if (!isNarrowWidth) {
    return <ManageTags />;
  }

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Tags')}
          leftContent={<SettingsBackButton />}
        />
      }
    >
      <ManageTags />
    </Page>
  );
};
