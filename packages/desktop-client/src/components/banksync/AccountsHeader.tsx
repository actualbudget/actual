import React from 'react';
import { useTranslation } from 'react-i18next';

import { Cell, TableHeader } from '#components/table';

type AccountsHeaderProps = {
  unlinked: boolean;
  // Overrides the "Bank" column label. Used by providers that don't expose an
  // institution (e.g. FOB Statements shows the account type instead).
  bankColumnLabel?: string;
};

export function AccountsHeader({
  unlinked,
  bankColumnLabel,
}: AccountsHeaderProps) {
  const { t } = useTranslation();

  return (
    <TableHeader>
      <Cell
        value={t('Account')}
        width={!unlinked ? 250 : 'flex'}
        style={{ paddingLeft: '10px' }}
      />
      {!unlinked && (
        <>
          <Cell
            value={bankColumnLabel ?? t('Bank')}
            width="flex"
            style={{ paddingLeft: '10px' }}
          />
          <Cell
            value={t('Last sync')}
            width={160}
            style={{ paddingLeft: '10px' }}
          />
          <Cell value="" width={100} style={{ paddingLeft: '10px' }} />
        </>
      )}
    </TableHeader>
  );
}
