import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { AccountGroupHeader } from './AccountGroupHeader';
import { AccountRow } from './AccountRow';
import { useSidebarDragScope } from './SidebarDragScope';
import { dropZoneId } from './useAccountReorder';
import type { GroupBucket } from './useSidebarAccountTree';

const dropZoneStyle = {
  backgroundColor: theme.sidebarItemBackgroundHover,
  boxShadow: `inset 0 0 0 1px ${theme.sidebarItemAccentSelected}`,
  borderRadius: radius.sm,
};

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
  const { isDropZoneHighlighted } = useSidebarDragScope();
  const zoneId = dropZoneId(side, group?.id ?? null);
  const highlightStyle = isDropZoneHighlighted(zoneId) ? dropZoneStyle : null;

  if (group == null) {
    return (
      <View style={{ paddingLeft: spacing.xs, ...highlightStyle }}>
        {accounts.map(account => (
          <AccountRow
            key={account.id}
            account={account}
            showSyncDot={showSyncDot}
            dropZoneId={zoneId}
          />
        ))}
      </View>
    );
  }

  return (
    <View
      style={{
        paddingLeft: spacing.xs,
        marginBottom: spacing.xxs,
        ...highlightStyle,
      }}
    >
      <AccountGroupHeader
        group={group}
        side={side}
        accountCount={accounts.length}
        failedCount={failedCount}
        isOpen={isOpen}
        onToggle={onToggle}
        dropZoneId={zoneId}
      />
      {isOpen && (
        <View style={{ paddingLeft: spacing.sm }}>
          {accounts.map(account => (
            <AccountRow
              key={account.id}
              account={account}
              showSyncDot={showSyncDot}
              dropZoneId={zoneId}
            />
          ))}
        </View>
      )}
    </View>
  );
}
