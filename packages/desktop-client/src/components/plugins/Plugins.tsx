import React from 'react';
import { useTranslation } from 'react-i18next';

import { ManagePlugins } from './ManagePlugins';

import { Page } from '#components/Page';

export function Plugins() {
  const { t } = useTranslation();
  return (
    <Page header={t('Plugins')}>
      <ManagePlugins />
    </Page>
  );
}
