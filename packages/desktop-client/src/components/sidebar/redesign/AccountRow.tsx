import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import type { AccountEntity } from '@actual-app/core/types/models';

import { isAccountFailedSync } from '#accounts/syncStatus';
import { Link } from '#components/common/Link';
import { useUpdatedAccounts } from '#hooks/useUpdatedAccounts';
import { useSelector } from '#redux';
import * as bindings from '#spreadsheet/bindings';

import { SidebarBalance } from './SidebarBalance';
import { SyncDot, useSyncDotLabel } from './SyncDot';
import type { SyncDotStatus } from './SyncDot';

type AccountRowProps = {
  account: AccountEntity;
  isClosed?: boolean;
};

export function AccountRow({ account, isClosed }: AccountRowProps) {
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const updatedAccounts = useUpdatedAccounts();
  const isUpdated = !isClosed && updatedAccounts.includes(account.id);

  let status: SyncDotStatus = 'unlinked';
  if (!isClosed && account.bank) {
    if (isAccountFailedSync(account)) {
      status = 'error';
    } else if (syncingAccountIds.includes(account.id)) {
      status = 'pending';
    } else {
      status = 'synced';
    }
  }
  const statusLabel = useSyncDotLabel(status);

  return (
    <Link
      variant="internal"
      to={`/accounts/${account.id}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.xs}px ${spacing.sm}px`,
        borderRadius: radius.sm,
        fontSize: 13,
        textDecoration: isClosed ? 'line-through' : 'none',
        color: isClosed ? theme.sidebarTextMuted : theme.sidebarItemText,
        ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
        ...(isUpdated && {
          fontWeight: 700,
          color: theme.sidebarItemTextUpdated,
        }),
      }}
      activeStyle={{
        backgroundColor: theme.sidebarItemBackgroundSelected,
        color: theme.sidebarItemTextSelected,
        fontWeight: 'normal',
      }}
    >
      <SyncDot status={status} />
      <Text style={{ flex: 1, ...styles.ellipsisText }}>{account.name}</Text>
      <Text style={styles.visuallyHidden}>{statusLabel}</Text>
      <SidebarBalance
        binding={bindings.accountBalance(account.id)}
        style={{ fontSize: 12, color: 'inherit' }}
      />
    </Link>
  );
}
