import { type ReactNode } from 'react';

import { css } from 'glamor';

import { type CSSProperties } from '../../style';

type InlineFieldProps = {
  label: ReactNode;
  labelWidth?: number;
  children?: ReactNode;
  width: number;
  style?: CSSProperties;
};

export default function InlineField({
  label,
  labelWidth,
  children,
  width,
  style,
}: InlineFieldProps) {
  return (
    <label
      {...css(
        {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          margin: '7px 0',
          width,
        },
        style,
      )}
    >
      <div
        style={{
          width: labelWidth || 75,
          textAlign: 'right',
          paddingRight: 10,
        }}
      >
        {label}:
      </div>
      {children}
    </label>
  );
}
