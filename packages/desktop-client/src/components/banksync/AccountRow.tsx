import React, { memo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { Tooltip } from '@actual-app/components/tooltip';
import { tsToRelativeTime } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import type { Locale } from 'date-fns';

import { Cell, Row } from '#components/table';

import { accountsSubgridStyle } from './accountsTableLayout';
import { formatLastSyncDateTime } from './bankSyncUtils';

type AccountRowProps = {
  account: AccountEntity;
  hovered: boolean;
  onHover: (id: AccountEntity['id'] | null) => void;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
  locale: Locale;
};

export const AccountRow = memo(
  ({ account, hovered, onHover, onAction, locale }: AccountRowProps) => {
    const { t } = useTranslation();
    const backgroundFocus = hovered;

    // The bank name is stored as null when the sync provider doesn't report an
    // institution; show a localized fallback for linked accounts.
    const bankName =
      account.bank && !account.bankName ? t('Unknown') : account.bankName;

    const lastSyncString = tsToRelativeTime(account.last_sync, locale, {
      capitalize: true,
    });
    const lastSyncDateTime = formatLastSyncDateTime(account.last_sync, locale);
    const [isLastSyncFocused, setIsLastSyncFocused] = useState(false);

    const potentiallyTruncatedAccountName =
      account.name.length > 30
        ? account.name.slice(0, 30) + '...'
        : account.name;

    return (
      <Row
        height="auto"
        style={{
          ...accountsSubgridStyle,
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
          width="flex"
          plain
          style={{
            color: theme.tableText,
            padding: spacing.sm,
            minWidth: 0,
            overflowWrap: 'anywhere',
          }}
        >
          {potentiallyTruncatedAccountName}
        </Cell>

        {account.account_sync_source != null && (
          <Cell
            name="bankName"
            width="flex"
            plain
            style={{
              color: theme.tableText,
              padding: spacing.sm,
              minWidth: 0,
              overflowWrap: 'anywhere',
            }}
          >
            {bankName}
          </Cell>
        )}

        {account.account_sync_source != null && account.last_sync == null && (
          <Cell
            name="lastSync"
            width="flex"
            plain
            style={{ color: theme.tableText, padding: spacing.sm, minWidth: 0 }}
          >
            <Trans>Not synced yet</Trans>
          </Cell>
        )}

        {account.account_sync_source != null && account.last_sync != null && (
          <Tooltip
            placement="bottom start"
            content={lastSyncDateTime}
            triggerProps={isLastSyncFocused ? { isOpen: true } : undefined}
            style={{
              ...styles.tooltip,
            }}
          >
            <Cell
              name="lastSync"
              width="100%"
              plain
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: `${spacing.xs}px ${spacing.sm}px`,
              }}
              data-vrt-mask
            >
              <Button
                variant="bare"
                onFocus={() => setIsLastSyncFocused(true)}
                onBlur={() => setIsLastSyncFocused(false)}
                style={{
                  alignSelf: 'flex-start',
                  padding: 0,
                  minHeight: 24,
                  textAlign: 'left',
                  overflow: 'visible',
                  backgroundColor: 'transparent',
                  color: theme.tableText,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    textDecoration: 'underline',
                    textDecorationStyle: 'dashed',
                    textDecorationColor: theme.pageTextSubdued,
                    textUnderlineOffset: '4px',
                  }}
                >
                  {lastSyncString}
                </span>
                <span style={styles.visuallyHidden}>
                  {t('{{relativeTime}}, {{dateTime}}', {
                    relativeTime: lastSyncString,
                    dateTime: lastSyncDateTime,
                  })}
                </span>
              </Button>
            </Cell>
          </Tooltip>
        )}

        {account.account_sync_source ? (
          <Cell
            name="edit"
            width="flex"
            plain
            style={{ paddingInline: spacing.sm, alignItems: 'flex-end' }}
          >
            <Button
              aria-label={t('Edit {{accountName}}', {
                accountName: account.name,
              })}
              onPress={() => onAction(account, 'edit')}
            >
              <Trans>Edit</Trans>
            </Button>
          </Cell>
        ) : (
          <Cell
            name="link"
            width="flex"
            plain
            style={{ paddingInline: spacing.sm, alignItems: 'flex-end' }}
          >
            <Button
              aria-label={t('Link account {{accountName}}', {
                accountName: account.name,
              })}
              onPress={() => onAction(account, 'link')}
            >
              <Trans>Link account</Trans>
            </Button>
          </Cell>
        )}
      </Row>
    );
  },
);

AccountRow.displayName = 'AccountRow';
