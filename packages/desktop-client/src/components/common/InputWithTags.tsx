import React, {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useState,
  useRef,
} from 'react';

import { css } from 'glamor';

import { useTagPopover } from '../../hooks/useTagPopover';
import { type CSSProperties, styles, theme } from '../../style';
import { TagPopover } from '../autocomplete/TagAutocomplete';

import { defaultInputStyle } from './Input';

type InputWithTagsProps = InputHTMLAttributes<HTMLInputElement> & {
  style?: CSSProperties;
  inputRef?: Ref<HTMLInputElement>;
  onEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onEscape?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onChangeValue?: (newValue: string) => void;
  onUpdate?: (newValue: string) => void;
  focused?: boolean;
};

export function InputWithTags({
  style,
  inputRef,
  onEnter,
  onEscape,
  onChangeValue,
  onUpdate,
  focused,
  className,
  ...nativeProps
}: InputWithTagsProps) {
  const ref = useRef<HTMLInputElement>(null);

  const {
    content,
    setContent,
    hint,
    showAutocomplete,
    setShowAutocomplete,
    keyPressed,
    setKeyPressed,
    handleKeyDown,
    handleMenuSelect,
  } = useTagPopover(nativeProps.value, onUpdate, ref);
  const [inputValue, setInputValue] = useState(content);

  useEffect(() => {
    setInputValue(content);
    console.log(content);
  }, [content]);

  return (
    <div>
      <input
        value={inputValue}
        ref={ref}
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
        )} ${className}`}
        {...nativeProps}
        onKeyDown={e => {
          nativeProps.onKeyDown?.(e);

          if (e.key === 'Enter' && onEnter) {
            onEnter(e);
          }

          if (e.key === 'Escape' && onEscape) {
            onEscape(e);
          }

          handleKeyDown(e);
        }}
        onBlur={e => {
          onUpdate?.(content);
          nativeProps.onBlur?.(e);
        }}
        onChange={e => {
          setContent(ref.current.value);
          onChangeValue?.(ref.current.value);
          nativeProps.onChange?.(e);
        }}
      />
      <TagPopover
        triggerRef={ref}
        isOpen={showAutocomplete}
        hint={hint}
        keyPressed={keyPressed}
        onMenuSelect={handleMenuSelect}
        onKeyHandled={() => setKeyPressed(null)}
        onClose={() => setShowAutocomplete(false)}
      />
    </div>
  );
}
