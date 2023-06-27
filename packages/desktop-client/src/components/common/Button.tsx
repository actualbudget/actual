import React, { forwardRef } from 'react';

import { css, type CSSProperties } from 'glamor';

import Loading from '../../icons/AnimatedLoading';
import { styles, colorsm } from '../../style';
import { type HTMLPropsWithStyle } from '../../types/utils';

import View from './View';

type ButtonProps = HTMLPropsWithStyle<HTMLButtonElement> & {
  pressed?: boolean;
  primary?: boolean;
  hover?: boolean;
  bare?: boolean;
  disabled?: boolean;
  hoveredStyle?: CSSProperties;
  activeStyle?: CSSProperties;
  textStyle?: CSSProperties;
  bounce?: boolean;
  as?: 'button';
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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
      {
        ...styles.shadow,
        cursor: 'pointer',
        border: bare
          ? null
          : '1px solid ' +
            (primary
              ? colorsm.buttonPositiveBorder
              : disabled
              ? colorsm.buttonDisabledBorder
              : colorsm.buttonNeutralBorder),
        color: bare
          ? null
          : primary
          ? colorsm.buttonPositiveTextHover
          : disabled
          ? colorsm.buttonDisabledText
          : colorsm.buttonNeutralTextHover,
        backgroundColor: bare
          ? 'inherit'
          : primary
          ? colorsm.buttonPositiveBackgroundHover
          : disabled
          ? colorsm.buttonDisabledBackground
          : colorsm.buttonNeutralBackgroundHover,
      },
      hoveredStyle,
    ];
    activeStyle = [
      bare
        ? { backgroundColor: 'rgba(100, 100, 100, .25)' }
        : {
            border: colorsm.buttonNeutralBorder,
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
            ? colorsm.buttonDisabledBackground
            : colorsm.buttonPositiveBackground
          : colorsm.buttonNeutralBackground,
        border: bare
          ? 'none'
          : '1px solid ' +
            (primary
              ? disabled
                ? colorsm.buttonDisabledBorder
                : colorsm.buttonPositiveBorder
              : colorsm.buttonNeutralBorder),
        color: bare
          ? 'inherit'
          : primary
          ? colorsm.buttonPositiveText
          : disabled
          ? colorsm.buttonDisabledText
          : colorsm.buttonNeutralText,
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
          <Loading
            color="currentColor"
            style={{ width: 20, height: 20, color: 'currentColor' }}
          />
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
