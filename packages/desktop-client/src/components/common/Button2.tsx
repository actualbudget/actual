import React, { forwardRef, type ComponentPropsWithoutRef } from 'react';
import {
  type ButtonRenderProps as ReactAriaButtonRenderProps,
  Button as ReactAriaButton,
} from 'react-aria-components';

import { css } from 'glamor';

import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { type CSSProperties, styles, theme } from '../../style';

import { View } from './View';

const backgroundColor: {
  [key in ButtonVariant | `${ButtonVariant}Disabled`]?: string;
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

const backgroundColorHover: Record<
  ButtonVariant | `${ButtonVariant}Disabled`,
  CSSProperties['backgroundColor']
> = {
  normal: theme.buttonNormalBackgroundHover,
  primary: theme.buttonPrimaryBackgroundHover,
  bare: theme.buttonBareBackgroundHover,
  menu: theme.buttonMenuBackgroundHover,
  menuSelected: theme.buttonMenuSelectedBackgroundHover,
  normalDisabled: 'transparent',
  primaryDisabled: 'transparent',
  bareDisabled: 'transparent',
  menuDisabled: 'transparent',
  menuSelectedDisabled: 'transparent',
};

const borderColor: {
  [key in
    | ButtonVariant
    | `${ButtonVariant}Disabled`]?: CSSProperties['borderColor'];
} = {
  normal: theme.buttonNormalBorder,
  normalDisabled: theme.buttonNormalDisabledBorder,
  primary: theme.buttonPrimaryBorder,
  primaryDisabled: theme.buttonPrimaryDisabledBorder,
  menu: theme.buttonMenuBorder,
  menuSelected: theme.buttonMenuSelectedBorder,
};

const textColor: {
  [key in ButtonVariant | `${ButtonVariant}Disabled`]?: CSSProperties['color'];
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
  [key in ButtonVariant]?: string;
} = {
  normal: theme.buttonNormalTextHover,
  primary: theme.buttonPrimaryTextHover,
  bare: theme.buttonBareTextHover,
  menu: theme.buttonMenuTextHover,
  menuSelected: theme.buttonMenuSelectedTextHover,
};

const _getBorder = (
  variant: ButtonVariant,
  variantWithDisabled: keyof typeof borderColor,
): string => {
  switch (variant) {
    case 'bare':
      return 'none';

    default:
      return '1px solid ' + borderColor[variantWithDisabled];
  }
};

const _getPadding = (variant: ButtonVariant): string => {
  switch (variant) {
    case 'bare':
      return '5px';
    default:
      return '5px 10px';
  }
};

const _getActiveStyles = (
  variant: ButtonVariant,
  bounce: boolean,
): CSSProperties => {
  switch (variant) {
    case 'bare':
      return { backgroundColor: theme.buttonBareBackgroundActive };
    default:
      return {
        transform: bounce ? 'translateY(1px)' : undefined,
        boxShadow: `0 1px 4px 0 ${
          variant === 'primary'
            ? theme.buttonPrimaryShadow
            : theme.buttonNormalShadow
        }`,
        transition: 'none',
      };
  }
};

type ButtonProps = ComponentPropsWithoutRef<typeof ReactAriaButton> & {
  variant?: ButtonVariant;
  bounce?: boolean;
};

type ButtonVariant = 'normal' | 'primary' | 'bare' | 'menu' | 'menuSelected';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { children, variant = 'normal', bounce = true, ...restProps } = props;

    const variantWithDisabled: ButtonVariant | `${ButtonVariant}Disabled` =
      props.isDisabled ? `${variant}Disabled` : variant;

    const hoveredStyle = {
      ...(variant !== 'bare' && styles.shadow),
      backgroundColor: backgroundColorHover[variant],
      color: textColorHover[variant],
      cursor: 'pointer',
    };
    const activeStyle = {
      ..._getActiveStyles(variant, bounce),
    };

    const defaultButtonClassName: ReactAriaButtonClassNameFn = renderProps =>
      String(
        css({
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: _getPadding(variant),
          margin: 0,
          overflow: 'hidden',
          display: 'flex',
          borderRadius: 4,
          backgroundColor: backgroundColor[variantWithDisabled],
          border: _getBorder(variant, variantWithDisabled),
          color: textColor[variantWithDisabled],
          transition: 'box-shadow .25s',
          WebkitAppRegion: 'no-drag',
          ...styles.smallText,
          ...(renderProps.isDisabled ? {} : { ':hover': hoveredStyle }),
          ...(renderProps.isDisabled ? {} : { ':active': activeStyle }),
        }),
      );

    const buttonClassName: ReactAriaButtonClassNameFn = renderProps =>
      typeof props.className === 'function'
        ? props.className(renderProps)
        : props.className || '';

    return (
      <ReactAriaButton
        ref={ref}
        {...restProps}
        className={renderProps =>
          `${renderProps.defaultClassName} ${defaultButtonClassName(renderProps)} ${buttonClassName(renderProps)}`
        }
      >
        {children}
      </ReactAriaButton>
    );
  },
);

Button.displayName = 'Button';

type ButtonWithLoadingProps = ButtonProps & {
  isLoading?: boolean;
};

export const ButtonWithLoading = forwardRef<
  HTMLButtonElement,
  ButtonWithLoadingProps
>((props, ref) => {
  const { isLoading, children, style, ...buttonProps } = props;
  return (
    <Button
      {...buttonProps}
      ref={ref}
      style={buttonRenderProps => ({
        position: 'relative',
        ...(typeof style === 'function' ? style(buttonRenderProps) : style),
      })}
    >
      {renderProps => (
        <>
          {isLoading && (
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
              opacity: isLoading ? 0 : 1,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {typeof children === 'function' ? children(renderProps) : children}
          </View>
        </>
      )}
    </Button>
  );
});

ButtonWithLoading.displayName = 'ButtonWithLoading';

type ReactAriaButtonClassNameFn = Extract<
  ComponentPropsWithoutRef<typeof ReactAriaButton>['className'],
  (
    renderProps: ReactAriaButtonRenderProps & { defaultClassName: string },
  ) => string
>;
