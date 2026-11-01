import type { ReactNode } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

type EmptyMessageProps = {
  children: ReactNode;
};

export function EmptyMessage({ children }: EmptyMessageProps) {
  return (
    <View
      style={{
        ...styles.smallText,
        flex: 1,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        fontStyle: 'italic',
        color: theme.pageTextSubdued,
        backgroundColor: theme.tableBackground,
      }}
    >
      {children}
    </View>
  );
}
