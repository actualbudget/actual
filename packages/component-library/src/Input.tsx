import React, {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
} from 'react';

import { css, cx } from '@emotion/css';

import { styles, type CSSProperties } from './styles';
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

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  style?: CSSProperties;
  inputRef?: Ref<HTMLInputElement>;
  onEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onEscape?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onChangeValue?: (newValue: string) => void;
  onUpdate?: (newValue: string) => void;
};

export function Input({
  style,
  inputRef,
  onEnter,
  onEscape,
  onChangeValue,
  onUpdate,
  className,
  ...nativeProps
}: InputProps) {
  return (
    <input
      ref={inputRef}
      className={cx(
        css(
          defaultInputStyle,
          {
            color: nativeProps.disabled
              ? theme.formInputTextPlaceholder
              : theme.formInputText,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            flexShrink: 0,
            '&:focus': {
              border: '1px solid ' + theme.formInputBorderSelected,
              boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
            },
            '::placeholder': { color: theme.formInputTextPlaceholder },
          },
          styles.smallText,
          style,
        ),
        className,
      )}
      {...nativeProps}
      onKeyDown={e => {
        nativeProps.onKeyDown?.(e);

        if (e.key === 'Enter' && onEnter) {
          onEnter(e);
        }

        if (e.key === 'Escape' && onEscape) {
          onEscape(e);
        }
      }}
      onBlur={e => {
        onUpdate?.(e.target.value);
        nativeProps.onBlur?.(e);
      }}
      onChange={e => {
        onChangeValue?.(e.target.value);
        nativeProps.onChange?.(e);
      }}
    />
  );
}

export function BigInput(props: InputProps) {
  return (
    <Input
      {...props}
      style={{
        padding: 10,
        fontSize: 15,
        border: 'none',
        ...styles.shadow,
        ':focus': { border: 'none', ...styles.shadow },
        ...props.style,
      }}
    />
  );
}
