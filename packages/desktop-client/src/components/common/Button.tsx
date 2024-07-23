import React, { forwardRef, type ElementType, type HTMLProps } from 'react';

import { css } from 'glamor';

import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { type CSSProperties, styles, theme } from '../../style';

import { View } from './View';

type ButtonProps = HTMLProps<HTMLButtonElement> & {
  pressed?: boolean;
  hover?: boolean;
  type?: ButtonType;
  isSubmit?: boolean;
  disabled?: boolean;
  color?: string;
  style?: CSSProperties;
  hoveredStyle?: CSSProperties;
  activeStyle?: CSSProperties;
  textStyle?: CSSProperties;
  bounce?: boolean;
  as?: ElementType;
};

type ButtonType = 'normal' | 'primary' | 'bare' | 'menu' | 'menuSelected';

const backgroundColor: {
  [key in ButtonType | `${ButtonType}Disabled`]?: string;
} = {
  normal: theme.buttonNormalBackground,
  normalDisabled: theme.buttonNormalDisabledBackground,
  primary: theme.buttonPrimaryBackground,
  primaryDisabled: theme.buttonPrimaryDisabledBackground,
  bare: theme.buttonBareBackground,
  bareDisabled: theme.buttonBareDisabledBackground,
  menu: theme.buttonMenuBackground,
  menuSelected: theme.buttonMenuSelectedBackground,
};

const backgroundColorHover: Record<ButtonType, string> = {
  normal: theme.buttonNormalBackgroundHover,
  primary: theme.buttonPrimaryBackgroundHover,
  bare: theme.buttonBareBackgroundHover,
  menu: theme.buttonMenuBackgroundHover,
  menuSelected: theme.buttonMenuSelectedBackgroundHover,
};

const borderColor: {
  [key in ButtonType | `${ButtonType}Disabled`]?: string;
} = {
  normal: theme.buttonNormalBorder,
  normalDisabled: theme.buttonNormalDisabledBorder,
  primary: theme.buttonPrimaryBorder,
  primaryDisabled: theme.buttonPrimaryDisabledBorder,
  menu: theme.buttonMenuBorder,
  menuSelected: theme.buttonMenuSelectedBorder,
};

const textColor: {
  [key in ButtonType | `${ButtonType}Disabled`]?: string;
} = {
  normal: theme.buttonNormalText,
  normalDisabled: theme.buttonNormalDisabledText,
  primary: theme.buttonPrimaryText,
  primaryDisabled: theme.buttonPrimaryDisabledText,
  bare: theme.buttonBareText,
  bareDisabled: theme.buttonBareDisabledText,
  menu: theme.buttonMenuText,
  menuSelected: theme.buttonMenuSelectedText,
};

const textColorHover: {
  [key in ButtonType]?: string;
} = {
  normal: theme.buttonNormalTextHover,
  primary: theme.buttonPrimaryTextHover,
  bare: theme.buttonBareTextHover,
  menu: theme.buttonMenuTextHover,
  menuSelected: theme.buttonMenuSelectedTextHover,
};

const _getBorder = (
  type: ButtonType,
  typeWithDisabled: keyof typeof borderColor,
): string => {
  switch (type) {
    case 'bare':
      return 'none';

    default:
      return '1px solid ' + borderColor[typeWithDisabled];
  }
};

const _getPadding = (type: ButtonType): string => {
  switch (type) {
    case 'bare':
      return '5px';
    default:
      return '5px 10px';
  }
};

const _getActiveStyles = (type: ButtonType, bounce: boolean): CSSProperties => {
  switch (type) {
    case 'bare':
      return { backgroundColor: theme.buttonBareBackgroundActive };
    default:
      return {
        transform: bounce ? 'translateY(1px)' : undefined,
        boxShadow: `0 1px 4px 0 ${
          type === 'primary'
            ? theme.buttonPrimaryShadow
            : theme.buttonNormalShadow
        }`,
        transition: 'none',
      };
  }
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      pressed,
      hover,
      type = 'normal',
      isSubmit = type === 'primary',
      color,
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
    const typeWithDisabled: ButtonType | `${ButtonType}Disabled` = disabled
      ? `${type}Disabled`
      : type;

    hoveredStyle = {
      ...(type !== 'bare' && styles.shadow),
      backgroundColor: backgroundColorHover[type],
      color: color || textColorHover[type],
      ...hoveredStyle,
    };
    activeStyle = {
      ..._getActiveStyles(type, bounce),
      ...activeStyle,
    };

    const Component = as;
    const buttonStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      padding: _getPadding(type),
      margin: 0,
      overflow: 'hidden',
      display: 'flex',
      borderRadius: 4,
      backgroundColor: backgroundColor[typeWithDisabled],
      border: _getBorder(type, typeWithDisabled),
      color: color || textColor[typeWithDisabled],
      transition: 'box-shadow .25s',
      WebkitAppRegion: 'no-drag',
      ...styles.smallText,
      ':hover': !disabled && hoveredStyle,
      ':active': !disabled && activeStyle,
      ...(hover && hoveredStyle),
      ...(pressed && activeStyle),
      ...style,
    };

    return (
      <Component
        ref={ref}
        {...(typeof as === 'string'
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (css(buttonStyle) as any)
          : { style: buttonStyle })}
        disabled={disabled}
        type={isSubmit ? 'submit' : 'button'}
        {...nativeProps}
      >
        {children}
      </Component>
    );
  },
);

Button.displayName = 'Button';

type ButtonWithLoadingProps = ButtonProps & {
  loading?: boolean;
};

const ButtonWithLoading = forwardRef<HTMLButtonElement, ButtonWithLoadingProps>(
  (props, ref) => {
    const { loading, children, ...buttonProps } = props;
    return (
      <Button
        {...buttonProps}
        ref={ref}
        style={{ position: 'relative', ...buttonProps.style }}
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
  },
);

ButtonWithLoading.displayName = 'ButtonWithLoading';
