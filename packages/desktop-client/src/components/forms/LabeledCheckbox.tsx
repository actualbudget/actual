import React from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Checkbox } from './index';

type LabeledCheckboxProps = {
  id: string;
  checked?: ComponentProps<typeof Checkbox>['checked'];
  disabled?: ComponentProps<typeof Checkbox>['disabled'];
  onChange?: ComponentProps<typeof Checkbox>['onChange'];
  onMouseDown?: ComponentProps<typeof View>['onMouseDown'];
  children: ReactNode;
  style?: CSSProperties;
};

export function LabeledCheckbox({
  id,
  checked,
  disabled,
  onChange,
  onMouseDown,
  children,
  style,
}: LabeledCheckboxProps) {
  return (
    <View
      onMouseDown={onMouseDown}
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
