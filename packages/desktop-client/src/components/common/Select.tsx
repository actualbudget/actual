import { forwardRef } from 'react';

import { css } from 'glamor';

import { colors } from '../../style';
import type { HTMLPropsWithStyle } from '../../types/utils';

type SelectProps = HTMLPropsWithStyle<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ style, children, ...nativeProps }, ref) => {
    return (
      <select
        ref={ref}
        {...css(
          {
            backgroundColor: 'transparent',
            height: 28,
            fontSize: 14,
            flex: 1,
            border: '1px solid #d0d0d0',
            borderRadius: 4,
            color: colors.n1,
            ':focus': {
              border: '1px solid ' + colors.b5,
              boxShadow: '0 1px 1px ' + colors.b7,
              outline: 'none',
            },
          },
          style,
        )}
        {...nativeProps}
      >
        {children}
      </select>
    );
  },
);

export default Select;
