import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountGroupEntity } from '@actual-app/core/types/models';

import * as bindings from '#spreadsheet/bindings';

import { CollapseChevron } from './CollapseChevron';
import { CountPill } from './CountPill';
import { SidebarBalance } from './SidebarBalance';
import { groupLabelStyle } from './styles';
import { SyncErrorRollup } from './SyncErrorRollup';

type AccountGroupHeaderProps = {
  group: AccountGroupEntity;
  side: 'on' | 'off';
  accountCount: number;
  failedCount: number;
  isOpen: boolean;
  onToggle: () => void;
};

export function AccountGroupHeader({
  group,
  side,
  accountCount,
  failedCount,
  isOpen,
  onToggle,
}: AccountGroupHeaderProps) {
  return (
    <Button
      variant="bare"
      aria-expanded={isOpen}
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: spacing.xs,
        padding: `${spacing.xs}px ${spacing.sm}px ${spacing.xs}px ${spacing.xs}px`,
        borderRadius: radius.sm,
        width: '100%',
        backgroundColor: 'transparent',
      }}
    >
      <CollapseChevron isOpen={isOpen} size={11} />
      <Text style={{ ...groupLabelStyle, ...styles.ellipsisText }}>
        {group.name}
      </Text>
      <CountPill count={accountCount} />
      <SyncErrorRollup count={failedCount} />
      <View style={{ flex: 1 }} />
      <SidebarBalance
        binding={bindings.accountGroupBalance(group.id, side === 'off')}
        style={{ fontSize: 11, color: groupLabelStyle.color }}
      />
    </Button>
  );
}
