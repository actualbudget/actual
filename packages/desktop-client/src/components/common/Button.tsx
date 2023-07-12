import React, { forwardRef } from 'react';

import { css, type CSSProperties } from 'glamor';

import Loading from '../../icons/AnimatedLoading';
import { styles, colors } from '../../style';
import { type HTMLPropsWithStyle } from '../../types/utils';

import View from './View';

type ButtonProps = HTMLPropsWithStyle<HTMLButtonElement> & {
  hover?: boolean;
  pressed?: boolean;
  altMenu?: boolean;
  primary?: boolean;
  bare?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
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
      hover,
      pressed,
      altMenu,
      primary,
      bare,
      disabled,
      style,
      hoveredStyle,
      activeStyle,
      textStyle,
      bounce = true,
      as = 'button',
      ...nativeProps
    },
    ref,
  ) => {
    hoveredStyle = [
      !bare && { ...styles.shadow },
      {
        border: bare
          ? null
          : '1px solid ' +
            (disabled // always use disabled before primary since we can have a disabled primary button
              ? colors.buttonDisabledBorder
              : primary
              ? colors.buttonPositiveBorder
              : altMenu
              ? colors.buttonAltMenuBorder
              : colors.buttonNeutralBorder),
        color: bare
          ? null
          : disabled
          ? colors.buttonDisabledText
          : primary
          ? colors.buttonPositiveTextHover
          : altMenu
          ? colors.buttonAltMenuTextHover
          : colors.buttonNeutralTextHover,
        backgroundColor: bare
          ? 'rgba(100,100,100,0.15)' // doesn't do anything visible in dark mode, but keep for light
          : disabled
          ? colors.buttonDisabledBackground
          : primary
          ? colors.buttonPositiveBackgroundHover
          : altMenu
          ? colors.buttonAltMenuBackgroundHover
          : colors.buttonNeutralBackgroundHover,
      },
      hoveredStyle,
    ];
    activeStyle = [
      bare
        ? { backgroundColor: 'rgba(100, 100, 100, .25)' }
        : {
            transform: bounce && 'translateY(1px)',
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
          : disabled // always use disabled before primary since we can have a disabled primary button
          ? colors.buttonDisabledBackground
          : primary
          ? colors.buttonPositiveBackground
          : altMenu
          ? colors.buttonAltMenuBackground
          : colors.buttonNeutralBackground,
        border: bare
          ? 'none'
          : '1px solid ' +
            (disabled
              ? colors.buttonDisabledBorder
              : primary
              ? colors.buttonPositiveBorder
              : altMenu
              ? colors.buttonAltMenuBorder
              : colors.buttonNeutralBorder),
        color: bare
          ? 'inherit'
          : disabled
          ? colors.buttonDisabledText
          : primary
          ? colors.buttonPositiveText
          : altMenu
          ? colors.buttonAltMenuText
          : colors.buttonNeutralText,
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
