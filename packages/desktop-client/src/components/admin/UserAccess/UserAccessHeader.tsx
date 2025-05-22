import React from 'react';
import { useTranslation } from 'react-i18next';

import { Cell, TableHeader } from '@desktop-client/components/table';

export function UserAccessHeader() {
  const { t } = useTranslation();

  return (
    <TableHeader>
      <Cell value={t('Access')} width={100} style={{ paddingLeft: 15 }} />
      <Cell value={t('User')} width="flex" />
      <Cell value={t('Owner')} width={100} />
    </TableHeader>
  );
}
