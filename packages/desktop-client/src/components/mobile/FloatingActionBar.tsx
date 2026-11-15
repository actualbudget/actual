import type { CSSProperties, PropsWithChildren } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFixedMobileNavHeight } from './MobileNavTabs';

type FloatingActionBarProps = PropsWithChildren & {
  style: CSSProperties;
};

export function FloatingActionBar({ style, children }: FloatingActionBarProps) {
  const navHeight = useFixedMobileNavHeight();
  return (
    <View
      style={{
        backgroundColor: theme.floatingActionBarBackground,
        color: theme.floatingActionBarText,
        position: 'fixed',
        bottom: navHeight
          ? `calc(${navHeight + 10}px + env(safe-area-inset-bottom))`
          : 10,
        margin: '0 10px',
        width: '95vw',
        height: 60,
        zIndex: 100,
        borderRadius: 8,
        border: `1px solid ${theme.floatingActionBarBorder}`,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
