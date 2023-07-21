import React, { useRef, type KeyboardEvent, type Ref } from 'react';
import mergeRefs from 'react-merge-refs';

import { css } from 'glamor';

import { useProperFocus } from '../../hooks/useProperFocus';
import { styles, theme } from '../../style';
import { type HTMLPropsWithStyle } from '../../types/utils';

export const defaultInputStyle = {
  minHeight: '1.5em',
  outline: 0,
  color: theme.formInputText,
  backgroundColor: theme.formInputBackground,
  margin: 0,
  padding: 5,
  borderRadius: 4,
  border: '1px solid ' + theme.formInputBorder,
  '::placeholder': {
    color: theme.formInputTextPlaceholder,
  },
  ':hover': {
    backgroundColor: theme.formInputBackground,
  },
  ':focus': {
    color: theme.formInputText,
    backgroundColor: theme.formInputBackground,
    border: '1px solid ' + theme.formInputBorderSelected,
    boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
  },
};

type InputProps = HTMLPropsWithStyle<HTMLInputElement> & {
  inputRef?: Ref<HTMLInputElement>;
  onEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onUpdate?: (newValue: string) => void;
  focused?: boolean;
};

const Input = ({
  style,
  inputRef,
  onEnter,
  onUpdate,
  focused,
  ...nativeProps
}: InputProps) => {
  let ref = useRef();
  useProperFocus(ref, focused);

  return (
    <input
      ref={inputRef ? mergeRefs([inputRef, ref]) : ref}
      {...css(defaultInputStyle, styles.smallText, style)}
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
};

export default Input;
