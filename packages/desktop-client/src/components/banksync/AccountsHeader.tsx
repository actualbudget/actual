import React from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';

import { Cell, Row } from '#components/table';

import { accountsSubgridStyle } from './accountsTableLayout';

const headerCellStyle = {
  justifyContent: 'center',
  padding: `0 ${spacing.sm}px`,
  minWidth: 0,
};

type AccountsHeaderProps = {
  unlinked: boolean;
};

export function AccountsHeader({ unlinked }: AccountsHeaderProps) {
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
      <Cell width="flex" plain style={headerCellStyle}>
        <Trans>Account</Trans>
      </Cell>
      {!unlinked && (
        <>
          <Cell width="flex" plain style={headerCellStyle}>
            <Trans>Bank</Trans>
          </Cell>
          <Cell width="flex" plain style={headerCellStyle}>
            <Trans>Last sync</Trans>
          </Cell>
        </>
      )}
      <Cell value="" width="flex" />
    </Row>
  );
}
