import React, {
  forwardRef,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { Button as ReactAriaButton } from 'react-aria-components';

import { css } from '@emotion/css';

import { AnimatedLoading } from './icons/AnimatedLoading';
import { styles } from './styles';
import { theme } from './theme';
import { View } from './View';

const backgroundColor: {
  [key in ButtonVariant | `${ButtonVariant}Disabled`]?: string;
} = {
  normal: 'transparent',
  normalDisabled: 'transparent',
  primary: theme.buttonPrimaryBackground,
  primaryDisabled: theme.buttonPrimaryDisabledBackground,
  bare: 'transparent',
  bareDisabled: theme.buttonBareDisabledBackground,
  menu: theme.buttonMenuBackground,
  menuSelected: theme.buttonMenuSelectedBackground,
};

const backgroundColorHover: Record<
  ButtonVariant | `${ButtonVariant}Disabled`,
  CSSProperties['backgroundColor']
> = {
  normal: 'var(--color-fill-float-hover)',
  primary: theme.buttonPrimaryBackgroundHover,
  bare: 'var(--color-fill-ghost)',
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
  normal: 'var(--color-border-hint)',
  normalDisabled: 'var(--color-border-hint)',
  primary: theme.buttonPrimaryBorder,
  primaryDisabled: theme.buttonPrimaryDisabledBorder,
  menu: theme.buttonMenuBorder,
  menuSelected: theme.buttonMenuSelectedBorder,
};

const textColor: {
  [key in ButtonVariant | `${ButtonVariant}Disabled`]?: CSSProperties['color'];
} = {
  normal: 'var(--color-foreground-contrast)',
  normalDisabled: 'var(--color-foreground-disabled)',
  primary: theme.buttonPrimaryText,
  primaryDisabled: theme.buttonPrimaryDisabledText,
  bare: 'var(--color-foreground-contrast)',
  bareDisabled: theme.buttonBareDisabledText,
  menu: theme.buttonMenuText,
  menuSelected: theme.buttonMenuSelectedText,
};

const textColorHover: {
  [key in ButtonVariant]?: string;
} = {
  normal: 'var(--color-foreground-contrast)',
  primary: theme.buttonPrimaryTextHover,
  bare: 'var(--color-foreground-contrast)',
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

const _getHoveredStyles = (variant: ButtonVariant): CSSProperties => ({
  ...(variant !== 'bare' && styles.shadow),
  backgroundColor: backgroundColorHover[variant],
  color: textColorHover[variant],
  cursor: 'pointer',
});

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
  children?: ReactNode;
};

type ButtonVariant = 'normal' | 'primary' | 'bare' | 'menu' | 'menuSelected';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { children, variant = 'normal', bounce = true, ...restProps } = props;

    const variantWithDisabled: ButtonVariant | `${ButtonVariant}Disabled` =
      props.isDisabled ? `${variant}Disabled` : variant;

    const defaultButtonClassName: string = useMemo(
      () =>
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
            '&[data-hovered]': _getHoveredStyles(variant),
            '&[data-pressed]': _getActiveStyles(variant, bounce),
          }),
        ),
      [bounce, variant, variantWithDisabled],
    );

    const className = restProps.className;

    return (
      <ReactAriaButton
        ref={ref}
        {...restProps}
        className={
          typeof className === 'function'
            ? renderProps =>
                `${defaultButtonClassName} ${className(renderProps)}`
            : `${defaultButtonClassName} ${className || ''}`
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
        {children}
      </View>
    </Button>
  );
});

ButtonWithLoading.displayName = 'ButtonWithLoading';
