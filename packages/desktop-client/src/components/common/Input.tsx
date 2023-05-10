import React, { useRef, type KeyboardEvent, type Ref } from 'react';
import mergeRefs from 'react-merge-refs';

import { css } from 'glamor';

import { useProperFocus } from '../../hooks/useProperFocus';
import { styles, colors } from '../../style';
import { type HTMLPropsWithStyle } from '../../types/utils';

export const defaultInputStyle = {
  outline: 0,
  backgroundColor: 'white',
  margin: 0,
  padding: 5,
  borderRadius: 4,
  border: '1px solid #d0d0d0',
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
      {...css(
        defaultInputStyle,
        {
          ':focus': {
            border: '1px solid ' + colors.b5,
            boxShadow: '0 1px 1px ' + colors.b7,
          },
          '::placeholder': { color: colors.n7 },
        },
        styles.smallText,
        style,
      )}
      {...nativeProps}
      onKeyDown={e => {
        if (e.key === 'Enter' && onEnter) {
          onEnter(e);
        }

        nativeProps.onKeyDown && nativeProps.onKeyDown(e);
      }}
      onChange={e => {
        if (onUpdate) {
          onUpdate(e.target.value);
        }
        nativeProps.onChange && nativeProps.onChange(e);
      }}
    />
  );
};

export default Input;
