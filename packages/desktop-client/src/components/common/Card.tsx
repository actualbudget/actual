import { type ComponentProps, forwardRef } from 'react';

import { theme } from '../../style';

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
          boxShadow: '0 1px 2px #9594A8',
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
