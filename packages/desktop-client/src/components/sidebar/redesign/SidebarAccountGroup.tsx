import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { AccountGroupHeader } from './AccountGroupHeader';
import { AccountRow } from './AccountRow';
import type { GroupBucket } from './useSidebarAccountTree';

type SidebarAccountGroupProps = {
  bucket: GroupBucket;
  side: 'on' | 'off';
  showSyncDot: boolean;
  isOpen: boolean;
  onToggle: () => void;
};

export function SidebarAccountGroup({
  bucket,
  side,
  showSyncDot,
  isOpen,
  onToggle,
}: SidebarAccountGroupProps) {
  const { group, accounts, failedCount } = bucket;

  if (group == null) {
    return (
      <View style={{ paddingLeft: spacing.xs }}>
        {accounts.map(account => (
          <AccountRow
            key={account.id}
            account={account}
            showSyncDot={showSyncDot}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={{ paddingLeft: spacing.xs, marginBottom: spacing.xxs }}>
      <AccountGroupHeader
        group={group}
        side={side}
        accountCount={accounts.length}
        failedCount={failedCount}
        isOpen={isOpen}
        onToggle={onToggle}
      />
      {isOpen && (
        <View style={{ paddingLeft: spacing.sm }}>
          {accounts.map(account => (
            <AccountRow
              key={account.id}
              account={account}
              showSyncDot={showSyncDot}
            />
          ))}
        </View>
      )}
    </View>
  );
}
