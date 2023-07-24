import React, { forwardRef } from 'react';

import { css, type CSSProperties } from 'glamor';

import AnimatedLoading from '../../icons/AnimatedLoading';
import { styles, theme } from '../../style';
import { type HTMLPropsWithStyle } from '../../types/utils';

import View from './View';

type ButtonProps = HTMLPropsWithStyle<HTMLButtonElement> & {
  pressed?: boolean;
  hover?: boolean;
  type?: ButtonType;
  isSubmit?: boolean;
  disabled?: boolean;
  hoveredStyle?: CSSProperties;
  activeStyle?: CSSProperties;
  textStyle?: CSSProperties;
  bounce?: boolean;
  as?: 'button';
};

type ButtonType = 'normal' | 'primary' | 'bare';

const backgroundColor = {
  normal: theme.buttonNormalBackground,
  normalDisabled: theme.buttonNormalDisabledBackground,
  primary: theme.buttonPrimaryBackground,
  primaryDisabled: theme.buttonPrimaryDisabledBackground,
  bare: theme.buttonBareBackground,
  bareDisabled: theme.buttonBareDisabledBackground,
};

const backgroundColorHover = {
  normal: theme.buttonNormalBackgroundHover,
  primary: theme.buttonPrimaryBackgroundHover,
  bare: theme.buttonBareBackgroundHover,
};

const borderColor = {
  normal: theme.buttonNormalBorder,
  normalDisabled: theme.buttonNormalDisabledBorder,
  primary: theme.buttonPrimaryBorder,
  primaryDisabled: theme.buttonPrimaryDisabledBorder,
};

const textColor = {
  normal: theme.buttonNormalText,
  normalDisabled: theme.buttonNormalDisabledText,
  primary: theme.buttonPrimaryText,
  primaryDisabled: theme.buttonPrimaryDisabledText,
  bare: theme.buttonBareText,
  bareDisabled: theme.buttonBareDisabledText,
};

const textColorHover = {
  normal: theme.buttonNormalTextHover,
  primary: theme.buttonPrimaryTextHover,
  bare: theme.buttonBareTextHover,
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      pressed,
      hover,
      type = 'normal',
      isSubmit = type === 'primary',
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
    let typeWithDisabled = disabled ? type + 'Disabled' : type;

    hoveredStyle = [
      type !== 'bare' && styles.shadow,
      hoveredStyle,
      {
        backgroundColor: backgroundColorHover[type],
        color: textColorHover[type],
      },
    ];
    activeStyle = [
      type === 'bare'
        ? { backgroundColor: theme.buttonBareBackgroundActive }
        : {
            transform: bounce && 'translateY(1px)',
            boxShadow:
              '0 1px 4px 0 ' +
              (type === 'primary'
                ? theme.buttonPrimaryShadow
                : theme.buttonNormalShadow),
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
        padding: type === 'bare' ? '5px' : '5px 10px',
        margin: 0,
        overflow: 'hidden',
        display: 'flex',
        borderRadius: 4,
        backgroundColor: backgroundColor[typeWithDisabled],
        border:
          type === 'bare'
            ? 'none'
            : '1px solid ' + borderColor[typeWithDisabled],
        color: textColor[typeWithDisabled],
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
          : { style: buttonStyle, type: isSubmit ? 'submit' : 'button' })}
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
