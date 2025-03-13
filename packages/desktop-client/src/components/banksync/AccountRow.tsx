import React, { memo } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';

import { tsToRelativeTime } from 'loot-core/shared/util';
import { type AccountEntity } from 'loot-core/types/models';

import { Row, Cell } from '../table';

type AccountRowProps = {
  account: AccountEntity;
  hovered: boolean;
  onHover: (id: AccountEntity['id'] | null) => void;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
  locale: Locale;
};

export const AccountRow = memo(
  ({ account, hovered, onHover, onAction, locale }: AccountRowProps) => {
    const backgroundFocus = hovered;

    const lastSync = tsToRelativeTime(account.last_sync, locale, {
      capitalize: true,
    });

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
