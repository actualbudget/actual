import type { ReactNode } from 'react';

import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

type ManagePageProps = {
  description?: ReactNode;
  actions?: ReactNode;
  search?: ReactNode;
  selection?: ReactNode;
  menu?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
};

export function ManagePage({
  description,
  actions,
  search,
  selection,
  menu,
  style,
  children,
}: ManagePageProps) {
  return (
    <View style={{ flex: 1, minHeight: 0, gap: spacing.md, ...style }}>
      {description != null && (
        <Text
          style={{
            ...styles.smallText,
            lineHeight: 1.5,
            color: theme.pageTextLight,
          }}
        >
          {description}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          flexShrink: 0,
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          {actions}
        </View>
        {search}
        {selection}
        {menu}
      </View>
      {children}
    </View>
  );
}
