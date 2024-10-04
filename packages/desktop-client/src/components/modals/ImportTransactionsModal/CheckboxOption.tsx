import React, { type ComponentProps, type ReactNode } from 'react';

import { type CSSProperties, theme } from '../../../style';
import { View } from '../../common/View';
import { Checkbox } from '../../forms';

type CheckboxOptionProps = {
  id: string;
  checked?: ComponentProps<typeof Checkbox>['checked'];
  disabled?: ComponentProps<typeof Checkbox>['disabled'];
  onChange?: ComponentProps<typeof Checkbox>['onChange'];
  children: ReactNode;
  style?: CSSProperties;
};

export function CheckboxOption({
  id,
  checked,
  disabled,
  onChange,
  children,
  style,
}: CheckboxOptionProps) {
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
          color: disabled ? theme.pageTextSubdued : undefined,
        }}
      >
        {children}
      </label>
    </View>
  );
}
