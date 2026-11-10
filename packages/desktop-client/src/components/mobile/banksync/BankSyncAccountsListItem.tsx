import type { GridListItemProps } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { tsToRelativeTime } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import type { WithRequired } from '@actual-app/core/types/util';

import { formatLastSyncDateTime } from '#components/banksync/bankSyncUtils';
import { ActionableGridListItem } from '#components/mobile/ActionableGridListItem';
import { useLocale } from '#hooks/useLocale';

type BankSyncAccountsListItemProps = WithRequired<
  GridListItemProps<AccountEntity>,
  'value'
>;

export function BankSyncAccountsListItem({
  value: account,
  ...props
}: BankSyncAccountsListItemProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  const isLinked = account.account_sync_source != null;
  const bankName = account.bankName ?? t('Unknown');

  let syncLine: string | null = null;
  let label = t('{{name}}, link account', { name: account.name });
  if (isLinked && account.last_sync != null) {
    syncLine = t('Synced {{time}}', {
      time: tsToRelativeTime(account.last_sync, locale),
    });
    label = t('{{name}}, {{bank}}, synced {{dateTime}}', {
      name: account.name,
      bank: bankName,
      dateTime: formatLastSyncDateTime(account.last_sync, locale),
    });
  } else if (isLinked) {
    syncLine = t('Not synced yet');
    label = t('{{name}}, {{bank}}, not synced yet', {
      name: account.name,
      bank: bankName,
    });
  }

  return (
    <ActionableGridListItem
      id={account.id}
      value={account}
      textValue={label}
      data-testid="bank-sync-account"
      {...props}
    >
      <SpaceBetween
        gap={spacing.md}
        style={{ flex: 1, alignItems: 'center', flexWrap: 'nowrap' }}
      >
        <SpaceBetween
          direction="vertical"
          gap={spacing.xs}
          style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: theme.pageText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
            title={account.name}
          >
            {account.name}
          </span>
          {syncLine != null && (
            <span
              data-testid="bank-sync-account-sync"
              data-vrt-mask
              style={{ fontSize: 13, color: theme.pageTextLight }}
            >
              {syncLine}
            </span>
          )}
        </SpaceBetween>

        {isLinked ? (
          <span
            style={{
              fontSize: 13,
              color: theme.pageTextLight,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '40%',
              flexShrink: 0,
            }}
          >
            {bankName}
          </span>
        ) : (
          <span
            style={{
              borderRadius: 4,
              padding: '3px 6px',
              backgroundColor: theme.noticeBackground,
              border: '1px solid ' + theme.noticeBackground,
              color: theme.noticeTextDark,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            <Trans>Link account</Trans>
          </span>
        )}
      </SpaceBetween>
    </ActionableGridListItem>
  );
}
