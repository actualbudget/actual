import { forwardRef } from 'react';

import { css } from 'glamor';

import { colorsm } from '../../style';
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
            border: '1px solid ' + colorsm.formInputBorder,
            borderRadius: 4,
            color: colorsm.formInputText,
            ':focus': {
              border: '1px solid ' + colorsm.formInputBorderSelected,
              boxShadow: '0 1px 1px ' + colorsm.formInputShadowSelected,
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
