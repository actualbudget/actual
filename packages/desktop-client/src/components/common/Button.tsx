import React from 'react';

import { css } from 'glamor';
import type { CSSProperties } from 'glamor';

import { styles, colors } from '../../style';

interface ButtonProps extends React.HTMLProps<HTMLButtonElement> {
  pressed?: boolean;
  primary?: boolean;
  hover?: boolean;
  bare?: boolean;
  disabled?: boolean;
  hoveredStyle?: CSSProperties;
  activeStyle?: CSSProperties;
  bounce?: boolean;
  as?: 'button';
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      children,
      pressed,
      primary,
      hover,
      bare,
      style,
      disabled,
      hoveredStyle,
      activeStyle,
      bounce = true,
      as = 'button',
      ...nativeProps
    },
    ref,
  ) => {
    hoveredStyle = [
      bare
        ? { backgroundColor: 'rgba(100, 100, 100, .15)' }
        : { ...styles.shadow },
      hoveredStyle,
    ];
    activeStyle = [
      bare
        ? { backgroundColor: 'rgba(100, 100, 100, .25)' }
        : {
            transform: bounce && 'translateY(1px)',
            boxShadow:
              !bare &&
              (primary
                ? '0 1px 4px 0 rgba(0,0,0,0.3)'
                : '0 1px 4px 0 rgba(0,0,0,0.2)'),
            transition: 'none',
          },
      activeStyle,
    ];

    let Component = as;
    let buttonStyle = [
      {
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: bare ? '5px' : '5px 10px',
        margin: 0,
        overflow: 'hidden',
        display: 'flex',
        borderRadius: 4,
        backgroundColor: bare
          ? 'transparent'
          : primary
          ? disabled
            ? colors.n7
            : colors.p5
          : 'white',
        border: bare
          ? 'none'
          : '1px solid ' +
            (primary ? (disabled ? colors.n7 : colors.p5) : colors.n9),
        color: primary ? 'white' : disabled ? colors.n6 : colors.n1,
        transition: 'box-shadow .25s',
        ...styles.smallText,
      },
      { ':hover': !disabled && hoveredStyle },
      { ':active': !disabled && activeStyle },
      hover && hoveredStyle,
      pressed && activeStyle,
      style,
    ];

    return (
      <Component
        ref={ref}
        {...(typeof as === 'string'
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (css(buttonStyle) as any)
          : { style: buttonStyle })}
        disabled={disabled}
        {...nativeProps}
      >
        {children}
      </Component>
    );
  },
);

export default Button;
