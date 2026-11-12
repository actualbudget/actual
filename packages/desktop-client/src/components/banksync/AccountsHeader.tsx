import React from 'react';
import { useTranslation } from 'react-i18next';

import { spacing } from '@actual-app/components/tokens';

import { Cell, TableHeader } from '#components/table';

type AccountsHeaderProps = {
  unlinked: boolean;
};

export function AccountsHeader({ unlinked }: AccountsHeaderProps) {
  const { t } = useTranslation();

  return (
    <TableHeader>
      <Cell
        value={t('Account')}
        width={!unlinked ? 250 : 'flex'}
        style={{ paddingLeft: spacing.sm }}
      />
      {!unlinked && (
        <>
          <Cell
            value={t('Bank')}
            width="flex"
            style={{ paddingLeft: spacing.sm }}
          />
          <Cell
            value={t('Last sync')}
            width={200}
            style={{ paddingLeft: spacing.sm }}
          />
          <Cell value="" width={100} style={{ paddingLeft: spacing.sm }} />
        </>
      )}
    </TableHeader>
  );
}
