import React, { type ComponentProps, type CSSProperties } from 'react';

import { type IntegerAmount } from 'loot-core/shared/util';

import { useFormat } from '@desktop-client/components/spreadsheet/useFormat';
import { Cell, InputValue } from '@desktop-client/components/table';

type FinancialInputCellProps = Omit<
  ComponentProps<typeof Cell>,
  'value' | 'formatter' | 'children'
> & {
  value: IntegerAmount | null;
  onUpdate: (value: IntegerAmount | null) => void;
  onBlur?: ComponentProps<typeof InputValue>['onBlur'];
  inputProps?: Omit<ComponentProps<typeof InputValue>, 'value' | 'onUpdate'>;
  textAlign?: CSSProperties['textAlign'];
};

export function FinancialInputCell({
  value: integerAmountValue,
  onUpdate,
  onBlur,
  textAlign = 'right',
  inputProps,
  name,
  width,
  exposed,
  focused,
  valueStyle,
  style,
  onExpose,
  privacyFilter,
  ...restCellProps
}: FinancialInputCellProps) {
  const format = useFormat();
  const formattedValue =
    integerAmountValue == null ? '' : format(integerAmountValue, 'financial');

  return (
    <Cell
      name={name}
      width={width}
      exposed={exposed}
      focused={focused}
      valueStyle={valueStyle}
      style={style}
      onExpose={onExpose}
      privacyFilter={privacyFilter}
      textAlign={textAlign}
      {...restCellProps}
      value={formattedValue}
      title={formattedValue}
    >
      {() => (
        <InputValue
          {...inputProps}
          value={
            integerAmountValue == null ? '' : format.forEdit(integerAmountValue)
          }
          onUpdate={(editedString: string) => {
            onUpdate(format.fromEdit(editedString, null));
          }}
          onBlur={onBlur}
          style={{ textAlign, ...(inputProps && inputProps.style) }}
        />
      )}
    </Cell>
  );
}
