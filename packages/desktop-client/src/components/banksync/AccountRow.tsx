import React, { memo } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { format as formatDate, type Locale } from 'date-fns';

import { tsToRelativeTime } from 'loot-core/shared/util';
import { type AccountEntity } from 'loot-core/types/models';

import { Row, Cell } from '@desktop-client/components/table';

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

    const lastSyncString = tsToRelativeTime(account.last_sync, locale, {
      capitalize: true,
    });
    const lastSyncDateTime = formatDate(
      new Date(parseInt(account.last_sync ?? '0', 10)),
      'MMM d, yyyy, HH:mm:ss',
      { locale },
    );

    const potentiallyTruncatedAccountName =
      account.name.length > 30
        ? account.name.slice(0, 30) + '...'
        : account.name;

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
          {potentiallyTruncatedAccountName}
        </Cell>

        <Cell
          name="bankName"
          width="flex"
          plain
          style={{ color: theme.tableText, padding: '10px' }}
        >
          {account.bankName}
        </Cell>

        {account.account_sync_source ? (
          <Tooltip
            placement="bottom start"
            content={lastSyncDateTime}
            style={{
              ...styles.tooltip,
            }}
          >
            <Cell
              name="lastSync"
              width={200}
              plain
              style={{
                color: theme.tableText,
                padding: '11px',
                textDecoration: 'underline',
                textDecorationStyle: 'dashed',
                textDecorationColor: theme.pageTextSubdued,
                textUnderlineOffset: '4px',
              }}
            >
              {lastSyncString}
            </Cell>
          </Tooltip>
        ) : (
          ''
        )}

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
