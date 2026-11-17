import React from 'react';
import type {
  ChangeEvent,
  ComponentPropsWithRef,
  FocusEvent,
  KeyboardEvent,
} from 'react';
import { Input as ReactAriaInput } from 'react-aria-components';

import { css, cx } from '@emotion/css';

import { useResponsive } from './hooks/useResponsive';
import { styles } from './styles';
import { theme } from './theme';
import {
  componentSizeControl,
  componentSizeText,
  sizeResponsiveStyles,
  type ComponentSize,
} from './tokens';

export const baseInputStyle = {
  outline: 0,
  backgroundColor: theme.tableBackground,
  color: theme.formInputText,
  margin: 0,
  padding: 5,
  borderRadius: 4,
  border: '1px solid ' + theme.formInputBorder,
};

// Builds the padding/typography overrides for an explicit `size`,
// varying by breakpoint via media queries (no hooks). Inputs use a
// uniform padding on all sides, like today's default.
const getInputSizeStyles = (size: ComponentSize): Record<string, unknown> => {
  const control = componentSizeControl[size];
  const text = componentSizeText[size];

  const getGroupStyles = (group: keyof typeof control) => {
    const { paddingY, minHeight } = control[group];
    const { fontSize, lineHeight } = text[group];

    return {
      padding: paddingY,
      ...(minHeight != null ? { minHeight } : null),
      fontSize,
      // Medium matches today's default look, which inherits line-height;
      // only the other sizes force their scale line-height.
      ...(size === 'medium' ? {} : { lineHeight }),
    };
  };

  return sizeResponsiveStyles({
    narrow: getGroupStyles('narrow'),
    small: getGroupStyles('small'),
    medium: getGroupStyles('medium'),
    wide: getGroupStyles('wide'),
  });
};

const inputSizeStyles = {
  small: getInputSizeStyles('small'),
  medium: getInputSizeStyles('medium'),
  large: getInputSizeStyles('large'),
  'extra-large': getInputSizeStyles('extra-large'),
} satisfies Record<ComponentSize, Record<string, unknown>>;

// Single source of truth for input class composition: base chrome, then
// either the default typography (styles.smallText) or the explicit size
// overrides, then any extra overrides — all in one css() call so there
// is never a cross-class specificity race.
const buildInputClassName = (
  size?: ComponentSize,
  overrides?: Record<string, unknown>,
) =>
  css({
    ...baseInputStyle,
    color: theme.formInputText,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    flexShrink: 0,
    '&[data-focused]': {
      border: '1px solid ' + theme.formInputBorderSelected,
      boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
    },
    '&[data-disabled]': {
      color: theme.formInputTextPlaceholder,
    },
    '::placeholder': { color: theme.formInputTextPlaceholder },
    ...(size ? inputSizeStyles[size] : styles.smallText),
    ...overrides,
  });

export const defaultInputClassName = buildInputClassName();

const inputSizeClassNames = {
  small: buildInputClassName('small'),
  medium: buildInputClassName('medium'),
  large: buildInputClassName('large'),
  'extra-large': buildInputClassName('extra-large'),
} satisfies Record<ComponentSize, string>;

export type InputProps = Omit<
  ComponentPropsWithRef<typeof ReactAriaInput>,
  'size'
> & {
  size?: ComponentSize;
  onEnter?: (value: string, event: KeyboardEvent<HTMLInputElement>) => void;
  onEscape?: (value: string, event: KeyboardEvent<HTMLInputElement>) => void;
  onChangeValue?: (
    newValue: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onUpdate?: (newValue: string, event: FocusEvent<HTMLInputElement>) => void;
};

export function Input({
  ref,
  onEnter,
  onEscape,
  onChangeValue,
  onUpdate,
  className,
  size,
  ...props
}: InputProps) {
  const baseClassName = size
    ? inputSizeClassNames[size]
    : defaultInputClassName;

  return (
    <ReactAriaInput
      ref={ref}
      className={
        typeof className === 'function'
          ? renderProps => cx(baseClassName, className(renderProps))
          : cx(baseClassName, className)
      }
      {...props}
      onKeyUp={e => {
        props.onKeyUp?.(e);

        if (e.key === 'Enter' && onEnter) {
          onEnter(e.currentTarget.value, e);
        }

        if (e.key === 'Escape' && onEscape) {
          onEscape(e.currentTarget.value, e);
        }
      }}
      onBlur={e => {
        onUpdate?.(e.currentTarget.value, e);
        props.onBlur?.(e);
      }}
      onChange={e => {
        onChangeValue?.(e.currentTarget.value, e);
        props.onChange?.(e);
      }}
    />
  );
}

// BigInput chrome: borderless with the ambient shadow instead. The
// legacy look (size omitted) keeps today's exact values (padding 10,
// fontSize 15); an explicit size swaps in the size tokens.
const bigInputChrome: Record<string, unknown> = {
  border: 'none',
  ...styles.shadow,
  '&[data-focused]': { border: 'none', ...styles.shadow },
};

const defaultBigInputClassName = buildInputClassName(undefined, {
  padding: 10,
  fontSize: 15,
  ...bigInputChrome,
});

const bigInputSizeClassNames = {
  small: buildInputClassName('small', bigInputChrome),
  medium: buildInputClassName('medium', bigInputChrome),
  large: buildInputClassName('large', bigInputChrome),
  'extra-large': buildInputClassName('extra-large', bigInputChrome),
} satisfies Record<ComponentSize, string>;

export function BigInput({ size, className, ...props }: InputProps) {
  const baseClassName = size
    ? bigInputSizeClassNames[size]
    : defaultBigInputClassName;

  return (
    <Input
      {...props}
      className={
        typeof className === 'function'
          ? renderProps => cx(baseClassName, className(renderProps))
          : cx(baseClassName, className)
      }
    />
  );
}

export function ResponsiveInput(props: InputProps) {
  const { isNarrowWidth } = useResponsive();

  return isNarrowWidth ? <BigInput {...props} /> : <Input {...props} />;
}
