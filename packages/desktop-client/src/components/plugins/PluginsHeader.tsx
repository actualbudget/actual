import React from 'react';
import { useTranslation } from 'react-i18next';

import { Cell, TableHeader } from '../table';

export function PluginsHeader() {
  const { t } = useTranslation();

  return (
    <TableHeader style={{}}>
      <Cell value={t('Name')} width={180} />
      <Cell value={t('Version')} width={80} />
      <Cell value={t('URL')} width="flex" />
      <Cell value={t('State')} width={100} />
      <Cell value={t('Description')} width="flex" />
      <Cell value={t('Actions')} width={100} />
    </TableHeader>
  );
}
