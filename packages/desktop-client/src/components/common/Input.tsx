import React, {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
  useRef,
} from 'react';

import { css } from 'glamor';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { useProperFocus } from '../../hooks/useProperFocus';
import { type CSSProperties, styles, theme } from '../../style';

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
  focused?: boolean;
};

export function Input({
  style,
  inputRef,
  onEnter,
  onEscape,
  onChangeValue,
  onUpdate,
  focused,
  ...nativeProps
}: InputProps) {
  const ref = useRef<HTMLInputElement>(null);
  useProperFocus(ref, focused);

  const mergedRef = useMergedRefs<HTMLInputElement>(ref, inputRef);

  return (
    <input
      ref={mergedRef}
      className={`${css(
        defaultInputStyle,
        {
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          flexShrink: 0,
          ':focus': {
            border: '1px solid ' + theme.formInputBorderSelected,
            boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
          },
          '::placeholder': { color: theme.formInputTextPlaceholder },
        },
        styles.smallText,
        style,
      )}`}
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
