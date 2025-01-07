import React from 'react';
import { useTranslation } from 'react-i18next';

import { Page } from '../Page';

import { ManagePlugins } from './ManagePlugins';

export function Plugins() {
  const { t } = useTranslation();
  return (
    <Page header={t('Plugins')}>
      <ManagePlugins />
    </Page>
  );
}
