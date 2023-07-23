import React, { forwardRef } from 'react';

import { css, type CSSProperties } from 'glamor';

import AnimatedLoading from '../../icons/AnimatedLoading';
import { styles, colors } from '../../style';
import { type HTMLPropsWithStyle } from '../../types/utils';

import View from './View';

type ButtonProps = HTMLPropsWithStyle<HTMLButtonElement> & {
  pressed?: boolean;
  hover?: boolean;
  type?: ButtonType;
  disabled?: boolean;
  hoveredStyle?: CSSProperties;
  activeStyle?: CSSProperties;
  textStyle?: CSSProperties;
  bounce?: boolean;
  as?: 'button';
};

type ButtonType = 'normal' | 'primary' | 'bare';

const backgroundColor = {
  normal: 'white',
  primary: colors.p5,
  primaryDisabled: colors.n7,
  bare: 'transparent',
};

const borderColor = {
  normal: colors.n9,
  primary: colors.p5,
  primaryDisabled: colors.n7,
};

const color = {
  normal: colors.n1,
  primary: 'white',
  primaryDisabled: colors.n6,
  bare: colors.n1,
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      pressed,
      hover,
      type = 'normal',
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
      type === 'bare'
        ? { backgroundColor: 'rgba(100, 100, 100, .15)' }
        : styles.shadow,
      hoveredStyle,
    ];
    activeStyle = [
      type === 'bare'
        ? { backgroundColor: 'rgba(100, 100, 100, .25)' }
        : {
            transform: bounce && 'translateY(1px)',
            boxShadow:
              type === 'primary'
                ? '0 1px 4px 0 rgba(0,0,0,0.3)'
                : '0 1px 4px 0 rgba(0,0,0,0.2)',
            transition: 'none',
          },
      activeStyle,
    ];

    let resolvedType =
      type === 'primary' && disabled ? 'primaryDisabled' : type;

    let Component = as;
    let buttonStyle = [
      {
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: type === 'bare' ? '5px' : '5px 10px',
        margin: 0,
        overflow: 'hidden',
        display: 'flex',
        borderRadius: 4,
        backgroundColor: backgroundColor[resolvedType],
        border:
          type === 'bare' ? 'none' : '1px solid ' + borderColor[resolvedType],
        color: color[resolvedType],
        transition: 'box-shadow .25s',
        WebkitAppRegion: 'no-drag',
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

type ButtonWithLoadingProps = ButtonProps & {
  loading?: boolean;
};

export const ButtonWithLoading = forwardRef<
  HTMLButtonElement,
  ButtonWithLoadingProps
>((props, ref) => {
  let { loading, children, ...buttonProps } = props;
  return (
    <Button
      {...buttonProps}
      ref={ref}
      style={[{ position: 'relative' }, buttonProps.style]}
    >
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </View>
      )}
      <View
        style={{
          opacity: loading ? 0 : 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {children}
      </View>
    </Button>
  );
});

export default Button;
