import React, { memo } from 'react';
import { Trans } from 'react-i18next';

import { format } from 'loot-core/src/shared/months';
import { type AccountEntity } from 'loot-core/src/types/models';

import { useDateFormat } from '../../hooks/useDateFormat';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Row, Cell } from '../table';

const tsToString = (ts: string | null, dateFormat: string) => {
  if (!ts) return 'Unknown';

  const parsed = new Date(parseInt(ts, 10));
  return `${format(parsed, dateFormat)} ${format(parsed, 'HH:mm:ss')}`;
};

type AccountRowProps = {
  account: AccountEntity;
  hovered: boolean;
  onHover: (id: AccountEntity['id'] | null) => void;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
};

export const AccountRow = memo(
  ({ account, hovered, onHover, onAction }: AccountRowProps) => {
    const backgroundFocus = hovered;

    const dateFormat = useDateFormat() || 'MM/dd/yyyy';

    const lastSync = tsToString(account.last_sync, dateFormat);

    return (
      <Row
        height="auto"
        style={{
          fontSize: 13,
          backgroundColor: backgroundFocus
            ? theme.tableRowBackgroundHover
            : theme.tableBackground,
        }}
        collapsed={true}
        onMouseEnter={() => onHover && onHover(account.id)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <Cell
          name="accountName"
          width={250}
          plain
          style={{ color: theme.tableText, padding: '10px' }}
        >
          {account.name}
        </Cell>

        <Cell
          name="bankName"
          width="flex"
          plain
          style={{ color: theme.tableText, padding: '10px' }}
        >
          {account.bankName}
        </Cell>

        <Cell
          name="lastSync"
          width={200}
          plain
          style={{ color: theme.tableText, padding: '10px' }}
        >
          {account.account_sync_source ? lastSync : ''}
        </Cell>

        {account.account_sync_source ? (
          <Cell name="edit" plain style={{ paddingRight: '10px' }}>
            <Button onPress={() => onAction(account, 'edit')}>
              <Trans>Edit</Trans>
            </Button>
          </Cell>
        ) : (
          <Cell name="link" plain style={{ paddingRight: '10px' }}>
            <Button onPress={() => onAction(account, 'link')}>
              <Trans>Link account</Trans>
            </Button>
          </Cell>
        )}
      </Row>
    );
  },
);

AccountRow.displayName = 'AccountRow';
