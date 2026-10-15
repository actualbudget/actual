import { Tree } from 'react-aria-components';
import type { Key } from 'react-aria-components';

import { css } from '@emotion/css';

import { AccountGroupHeader } from './AccountGroupHeader';
import { AccountRow } from './AccountRow';
import { treeKeys } from './treeKeys';
import { useAccountTreeDragAndDrop } from './useAccountTreeDragAndDrop';
import type { AccountTreeSide } from './useAccountTreeDragAndDrop';
import type { GroupBucket } from './useSidebarAccountTree';

type AccountTreeProps = {
  label: string;
  side: AccountTreeSide;
  buckets: GroupBucket[];
  showSyncDot: boolean;
  isDragDisabled: boolean;
  isBucketOpen?: (bucket: GroupBucket) => boolean;
  onToggleBucket?: (bucket: GroupBucket) => void;
};

export function AccountTree({
  label,
  side,
  buckets,
  showSyncDot,
  isDragDisabled,
  isBucketOpen,
  onToggleBucket,
}: AccountTreeProps) {
  const { dragAndDropHooks, isGroupDropZoneActive, isDraggingGroup } =
    useAccountTreeDragAndDrop({ side, buckets, isDisabled: isDragDisabled });

  const groupBuckets = buckets.filter(bucket => bucket.group != null);
  const expandedKeys = new Set<Key>(
    groupBuckets
      .filter(bucket => !isDraggingGroup && (isBucketOpen?.(bucket) ?? true))
      .map(bucket => treeKeys.group(bucket.group?.id ?? '')),
  );

  const onExpandedChange = (keys: Set<Key>) => {
    for (const bucket of groupBuckets) {
      const key = treeKeys.group(bucket.group?.id ?? '');
      if (keys.has(key) !== expandedKeys.has(key)) {
        onToggleBucket?.(bucket);
      }
    }
  };

  return (
    <Tree
      aria-label={label}
      selectionMode="none"
      expandedKeys={expandedKeys}
      onExpandedChange={onExpandedChange}
      dragAndDropHooks={dragAndDropHooks}
      className={css({ outline: 'none' })}
    >
      {buckets.map(bucket =>
        bucket.group == null ? (
          bucket.accounts.map(account => (
            <AccountRow
              key={treeKeys.account(account.id)}
              account={account}
              isClosed={side === 'closed'}
              showSyncDot={showSyncDot}
            />
          ))
        ) : (
          <AccountGroupHeader
            key={treeKeys.group(bucket.group.id)}
            group={bucket.group}
            side={side === 'off' ? 'off' : 'on'}
            accounts={bucket.accounts}
            failedCount={bucket.failedCount}
            showSyncDot={showSyncDot}
            isDropZoneActive={isGroupDropZoneActive(bucket.group.id)}
          />
        ),
      )}
    </Tree>
  );
}
