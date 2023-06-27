import React, { useRef, type KeyboardEvent, type Ref } from 'react';
import mergeRefs from 'react-merge-refs';

import { css } from 'glamor';

import { useProperFocus } from '../../hooks/useProperFocus';
import { styles, colorsm } from '../../style';
import { type HTMLPropsWithStyle } from '../../types/utils';

export const defaultInputStyle = {
  outline: 0,
  color: colorsm.formInputText,
  backgroundColor: colorsm.formInputBackground,
  margin: 0,
  padding: 5,
  borderRadius: 4,
  border: '1px solid ' + colorsm.formInputBorder,
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
      // Intentionally no background so we can blend with everywhere
      ref={inputRef ? mergeRefs([inputRef, ref]) : ref}
      {...css(
        defaultInputStyle,
        {
          color: colorsm.formInputText,
          ':focus': {
            border: '1px solid ' + colorsm.formInputBorderSelected,
            boxShadow: '0 1px 1px ' + colorsm.formInputShadowSelected,
          },
          '::placeholder': {
            color: colorsm.formInputTextPlaceholder,
          },
          '::selection': {
            color: colorsm.formInputTextSelection,
            backgroundColor: colorsm.formInputBackgroundSelected,
          },
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
