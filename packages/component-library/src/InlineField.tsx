import { type ReactNode } from 'react';

import { css } from '@emotion/css';

import { type CSSProperties } from './styles';

type InlineFieldProps = {
  label: ReactNode;
  labelWidth?: number;
  children?: ReactNode;
  width: number | string;
  style?: CSSProperties;
};

export function InlineField({
  label,
  labelWidth,
  children,
  width,
  style,
}: InlineFieldProps) {
  return (
    <label
      className={css([
        {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          margin: '7px 0',
          width,
        },
        style,
      ])}
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
