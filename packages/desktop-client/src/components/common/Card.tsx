import { type ComponentProps, forwardRef } from 'react';

import { colorsm } from '../../style';

import View from './View';

type CardProps = ComponentProps<typeof View>;

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, ...props }, ref) => {
    return (
      <View
        {...props}
        ref={ref}
        style={[
          {
            marginTop: 15,
            marginLeft: 5,
            marginRight: 5,
            borderRadius: 6,
            backgroundColor: colorsm.cardBackground,
            borderColor: colorsm.cardBorder,
            boxShadow: '0 1px 2px ' + colorsm.cardShadow,
          },
          props.style,
        ]}
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

export default Card;
