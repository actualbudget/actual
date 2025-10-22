import { Trans } from 'react-i18next';

import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { tsToRelativeTime } from 'loot-core/shared/util';
import { type AccountEntity } from 'loot-core/types/models';

import { useLocale } from '@desktop-client/hooks/useLocale';

type BankSyncAccountsListItemProps = {
  account: AccountEntity;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
  isLinked: boolean;
};

export function BankSyncAccountsListItem({
  account,
  onAction,
  isLinked,
}: BankSyncAccountsListItemProps) {
  const locale = useLocale();

  const lastSyncString = isLinked
    ? tsToRelativeTime(account.last_sync, locale, {
        capitalize: true,
      })
    : null;

  return (
    <Stack
      data-testid="bank-sync-account"
      direction="row"
      align="center"
      spacing={12}
      style={{
        backgroundColor: theme.tableBackground,
        borderBottomWidth: 1,
        borderBottomColor: theme.tableBorder,
        borderBottomStyle: 'solid',
        padding: 16,
        width: '100%',
        cursor: 'pointer',
      }}
      onClick={() => onAction(account, isLinked ? 'edit' : 'link')}
    >
      <Stack spacing={1} style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: theme.tableText,
          }}
        >
          {account.name}
        </Text>
        {isLinked && account.bankName && (
          <Text
            style={{
              fontSize: 13,
              color: theme.pageTextSubdued,
            }}
          >
            {account.bankName}
          </Text>
        )}
        {isLinked && lastSyncString && (
          <Text
            style={{
              fontSize: 13,
              color: theme.pageTextSubdued,
            }}
            data-vrt-mask
          >
            <Trans>Last sync: {{ time: lastSyncString }}</Trans>
          </Text>
        )}
      </Stack>

      <span
        style={{
          borderRadius: 4,
          padding: '5px 10px',
          backgroundColor: theme.noticeBackground,
          border: '1px solid ' + theme.noticeBackground,
          color: theme.noticeTextDark,
          fontSize: 13,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {isLinked ? <Trans>Edit</Trans> : <Trans>Link account</Trans>}
      </span>
    </Stack>
  );
}
