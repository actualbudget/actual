import React, { useRef } from 'react';

import { useFocusRing } from '@react-aria/focus';
import { useOption } from '@react-aria/listbox';
import { mergeProps } from '@react-aria/utils';

import { theme } from '../../../style';

export function Option({ isLast, item, state }) {
  // Get props for the option element
  const ref = useRef();
  const { optionProps, isSelected } = useOption({ key: item.key }, state, ref);

  // Determine whether we should show a keyboard
  const { isFocusVisible, focusProps } = useFocusRing();

  return (
    <li
      {...mergeProps(optionProps, focusProps)}
      ref={ref}
      style={{
        background: isSelected
          ? theme.tableRowBackgroundHighlight
          : theme.tableBackground,
        color: isSelected ? theme.tableText : null,
        outline: isFocusVisible ? '2px solid orange' : 'none',
        ...(!isLast && { borderBottom: `1px solid ${theme.tableBorder}` }),
      }}
    >
      {item.rendered}
    </li>
  );
}
