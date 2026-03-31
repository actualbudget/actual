import { Trans } from 'react-i18next';

import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { tsToRelativeTime } from 'loot-core/shared/util';
import type { AccountEntity } from 'loot-core/types/models';

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
    <View
      data-testid="bank-sync-account"
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
      <SpaceBetween gap={60}>
        <SpaceBetween
          direction="vertical"
          gap={5}
          style={{ flex: 1, alignItems: 'flex-start' }}
        >
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
        </SpaceBetween>

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
      </SpaceBetween>
    </View>
  );
}
