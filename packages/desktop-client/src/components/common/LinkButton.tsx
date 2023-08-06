import React, { type HTMLAttributes } from 'react';

import { css } from 'glamor';

import { styles, theme } from '../../style';

type LinkProps = HTMLAttributes<HTMLButtonElement>;

export default function LinkButton({
  style,
  children,
  ...nativeProps
}: LinkProps) {
  return (
    <button
      type="button"
      className={css([
        {
          textDecoration: 'none',
          color: theme.pageTextLink,
          backgroundColor: 'transparent',
          display: 'inline',
          border: 0,
          cursor: 'pointer',
          padding: 0,
          font: 'inherit',
          ':hover': {
            textDecoration: 'underline',
            boxShadow: 'none',
          },
          ':focus': {
            boxShadow: 'none',
          },
        },
        styles.smallText,
        style,
      ]).toString()}
      {...nativeProps}
    >
      {children}
    </button>
  );
}
