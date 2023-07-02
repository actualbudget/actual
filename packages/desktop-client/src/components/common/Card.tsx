import { type ComponentProps, forwardRef } from 'react';

import { colors } from '../../style';

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
            backgroundColor: 'white',
            borderColor: colors.p3,
            boxShadow: '0 1px 2px #9594A8',
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
