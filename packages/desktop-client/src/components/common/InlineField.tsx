import { type ReactNode } from 'react';

import { type CSSProperties, css } from 'glamor';

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
      className={css(
        {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          margin: '7px 0',
          width,
        },
        style,
      ).toString()}
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
