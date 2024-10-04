import React from 'react';

import { theme } from '../../../style';
import { View } from '../../common/View';
import { Checkbox } from '../../forms';

export function CheckboxOption({
  id,
  checked,
  disabled,
  onChange,
  children,
  style,
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        minHeight: 28,
        ...style,
      }}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <label
        htmlFor={id}
        style={{
          userSelect: 'none',
          color: disabled ? theme.pageTextSubdued : null,
        }}
      >
        {children}
      </label>
    </View>
  );
}
