import React from 'react';
import { useTranslation } from 'react-i18next';

import { Page } from '#components/Page';
import { useIsSettingsSubPage } from '#components/settings/SettingsSubPageContext';

import { ManageTags } from './ManageTags';

export const ManageTagsPage = () => {
  const isSettingsSubPage = useIsSettingsSubPage();
  const { t } = useTranslation();

  return (
    <Page
      header={isSettingsSubPage ? null : t('Tags')}
      padding={isSettingsSubPage ? 0 : undefined}
    >
      <ManageTags />
    </Page>
  );
};
