import React, {
  useRef,
  type KeyboardEvent,
  type Ref,
  type HTMLProps,
} from 'react';
import mergeRefs from 'react-merge-refs';

import { css } from 'glamor';

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

type InputProps = HTMLProps<HTMLInputElement> & {
  style?: CSSProperties;
  inputRef?: Ref<HTMLInputElement>;
  onEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onUpdate?: (newValue: string) => void;
  focused?: boolean;
};

export default function Input({
  style,
  inputRef,
  onEnter,
  onUpdate,
  focused,
  ...nativeProps
}: InputProps) {
  let ref = useRef();
  useProperFocus(ref, focused);

  return (
    <input
      ref={inputRef ? mergeRefs([inputRef, ref]) : ref}
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
        if (e.key === 'Enter' && onEnter) {
          onEnter(e);
        }

        nativeProps.onKeyDown?.(e);
      }}
      onChange={e => {
        if (onUpdate) {
          onUpdate(e.target.value);
        }
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
