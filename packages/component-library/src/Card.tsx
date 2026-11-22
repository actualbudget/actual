import { forwardRef } from 'react';
import type { ComponentProps } from 'react';

import { shadowColor } from './styles';
import { theme } from './theme';
import { View } from './View';

type CardProps = ComponentProps<typeof View>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, ...props }, ref) => {
    return (
      <View
        {...props}
        ref={ref}
        style={{
          marginTop: 15,
          marginLeft: 5,
          marginRight: 5,
          borderRadius: 6,
          backgroundColor: theme.cardBackground,
          borderColor: theme.cardBorder,
          boxShadow: `0 1px 2px ${shadowColor(0.4)}`,
          ...props.style,
        }}
      >
        <View
          style={{
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {children}
        </View>
      </View>
    );
  },
);

Card.displayName = 'Card';
