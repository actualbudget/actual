import React, { ChangeEvent, ComponentPropsWithRef, type KeyboardEvent, type FocusEvent } from 'react';
import { Input as ReactAriaInput } from 'react-aria-components';

import { css, cx } from '@emotion/css';

import { useResponsive } from './hooks/useResponsive';
import { styles } from './styles';
import { theme } from './theme';

export const defaultInputStyle = {
  outline: 0,
  backgroundColor: theme.tableBackground,
  color: theme.formInputText,
  margin: 0,
  padding: 5,
  borderRadius: 4,
  border: '1px solid ' + theme.formInputBorder,
};

export type InputProps = ComponentPropsWithRef<typeof ReactAriaInput> & {
  onEnter?: (value: string, event: KeyboardEvent<HTMLInputElement>) => void;
  onEscape?: (value: string, event: KeyboardEvent<HTMLInputElement>) => void;
  onChangeValue?: (newValue: string, event: ChangeEvent<HTMLInputElement>) => void;
  onUpdate?: (newValue: string, event: FocusEvent<HTMLInputElement>) => void;
};

export function Input({
  ref,
  onEnter,
  onEscape,
  onChangeValue,
  onUpdate,
  className,
  ...props
}: InputProps) {
  return (
    <ReactAriaInput
      ref={ref}
      className={renderProps =>
        cx(
          css(
            defaultInputStyle,
            {
              color: props.disabled
                ? theme.formInputTextPlaceholder
                : theme.formInputText,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              flexShrink: 0,
              '&[data-focused]': {
                border: '1px solid ' + theme.formInputBorderSelected,
                boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
              },
              '::placeholder': { color: theme.formInputTextPlaceholder },
            },
            styles.smallText,
          ),
          typeof className === 'function' ? className(renderProps) : className,
        )
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

export function BigInput(props: InputProps) {
  return (
    <Input
      {...props}
      className={renderProps =>
        cx(
          {
            padding: 10,
            fontSize: 15,
            border: 'none',
            ...styles.shadow,
            '&[data-focused]': { border: 'none', ...styles.shadow },
          },
          typeof props.className === 'function'
            ? props.className(renderProps)
            : props.className,
        )
      }
    />
  );
}

export function ResponsiveInput(props: InputProps) {
  const { isNarrowWidth } = useResponsive();

  return isNarrowWidth ? <BigInput {...props} /> : <Input {...props} />;
}
