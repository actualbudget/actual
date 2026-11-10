import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';

import { Cell, Row } from '#components/table';

import { accountsSubgridStyle } from './accountsTableLayout';

type AccountsHeaderProps = {
  unlinked: boolean;
};

export function AccountsHeader({ unlinked }: AccountsHeaderProps) {
  const { t } = useTranslation();

  return (
    <Row
      collapsed
      height="auto"
      style={{
        ...accountsSubgridStyle,
        minHeight: 32,
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 500,
      }}
    >
      <Cell
        value={t('Account')}
        width="flex"
        style={{ paddingLeft: spacing.sm, minWidth: 0 }}
      />
      {!unlinked && (
        <>
          <Cell
            value={t('Bank')}
            width="flex"
            style={{ paddingLeft: spacing.sm, minWidth: 0 }}
          />
          <Cell
            value={t('Last sync')}
            width="flex"
            style={{ paddingLeft: spacing.sm, minWidth: 0 }}
          />
        </>
      )}
      <Cell value="" width="flex" />
    </Row>
  );
}
