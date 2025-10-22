import { Trans } from 'react-i18next';

import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

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

      <View>
        {isLinked ? (
          <Text
            style={{
              fontSize: 13,
              color: theme.pageTextLink,
            }}
          >
            <Trans>Edit</Trans>
          </Text>
        ) : (
          <Text
            style={{
              fontSize: 13,
              color: theme.pageTextLink,
              fontWeight: 500,
            }}
          >
            <Trans>Link account</Trans>
          </Text>
        )}
      </View>
    </Stack>
  );
}
