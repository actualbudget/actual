// @ts-strict-ignore
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { type AccountEntity } from 'loot-core/src/types/models';

import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Row, Cell } from '../table';

type AccountRowProps = {
  account: AccountEntity;
  hovered: boolean;
  onHover: (id: AccountEntity['id']) => void;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
};

export const AccountRow = memo(
  ({ account, hovered, onHover, onAction }: AccountRowProps) => {
    const { t } = useTranslation();
    const backgroundFocus = hovered;

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
          name="stage"
          width={250}
          plain
          style={{ color: theme.tableText, padding: '10px' }}
        >
          {account.name}
        </Cell>

        <Cell
          name="stage"
          width="flex"
          plain
          style={{ color: theme.tableText, padding: '10px' }}
        >
          {account.bankName}
        </Cell>

        <Cell
          name="stage"
          width={140}
          plain
          style={{ color: theme.tableText, padding: '10px' }}
        >
          {account.account_sync_source ? 'Unknown' : ''}
        </Cell>

        {account.account_sync_source ? (
          <Cell name="edit" plain style={{ paddingRight: '10px' }}>
            <Button onPress={() => onAction(account, 'edit')}>
              {t('Edit')}
            </Button>
          </Cell>
        ) : (
          <Cell name="link" plain style={{ paddingRight: '10px' }}>
            <Button onPress={() => onAction(account, 'link')}>
              {t('Link account')}
            </Button>
          </Cell>
        )}
      </Row>
    );
  },
);

AccountRow.displayName = 'AccountRow';
