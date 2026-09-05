import type { ReactNode } from 'react';

import { SvgLogo } from '@actual-app/components/icons/logo';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { hasMacOSWindowButtons } from '#components/sidebar/SidebarShell';

import { SidebarBudgetName } from './SidebarBudgetName';
import { SyncStatusLine } from './SyncStatusLine';

const MAC_WINDOW_BUTTONS_INSET = spacing.xl + spacing.md;

type SidebarHeaderProps = {
  children?: ReactNode;
};

export function SidebarHeader({ children }: SidebarHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.md}px ${spacing.md}px ${spacing.sm}px`,
        paddingTop: hasMacOSWindowButtons()
          ? MAC_WINDOW_BUTTONS_INSET
          : spacing.md,
        borderBottom: `1px solid ${theme.sidebarBorder}`,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <SvgLogo
        width={28}
        height={28}
        style={{ flexShrink: 0, color: theme.sidebarBrand }}
      />
      <View style={{ minWidth: 0, flex: 1 }}>
        <SidebarBudgetName />
        <SyncStatusLine />
      </View>
      {children}
    </View>
  );
}
