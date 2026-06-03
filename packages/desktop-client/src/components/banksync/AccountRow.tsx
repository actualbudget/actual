import { memo } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { tsToRelativeTime } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import { format as formatDate } from 'date-fns';
import type { Locale } from 'date-fns';

import { Cell, Row } from '#components/table';

type AccountRowProps = {
  account: AccountEntity;
  hovered: boolean;
  onHover: (id: AccountEntity['id'] | null) => void;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
  locale: Locale;
  renderLinkButton?: (account: AccountEntity) => ReactNode;
};

export const AccountRow = memo(
  ({
    account,
    hovered,
    onHover,
    onAction,
    locale,
    renderLinkButton,
  }: AccountRowProps) => {
    const { t } = useTranslation();
    const backgroundFocus = hovered;

    // The bank name is stored as null when the sync provider doesn't report an
    // institution; show a localized fallback for linked accounts.
    const bankName =
      account.bank && !account.bankName ? t('Unknown') : account.bankName;

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
        collapsed
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
          {bankName}
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
              data-vrt-mask
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
            {renderLinkButton ? (
              renderLinkButton(account)
            ) : (
              <Button onPress={() => onAction(account, 'link')}>
                <Trans>Link account</Trans>
              </Button>
            )}
          </Cell>
        )}
      </Row>
    );
  },
);

AccountRow.displayName = 'AccountRow';
