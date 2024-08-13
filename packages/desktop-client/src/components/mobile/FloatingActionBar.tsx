import { type PropsWithChildren } from 'react';

import { theme, type CSSProperties } from '../../style';
import { View } from '../common/View';

type FloatingActionBarProps = PropsWithChildren & {
  style: CSSProperties;
};

export function FloatingActionBar({ style, children }: FloatingActionBarProps) {
  return (
    <View
      style={{
        backgroundColor: theme.floatingActionBarBackground,
        color: theme.floatingActionBarText,
        position: 'fixed',
        bottom: 10,
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
