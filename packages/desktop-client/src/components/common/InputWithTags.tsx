import React, {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useRef,
} from 'react';

import { css } from 'glamor';

import { useMergedRefs } from '../../hooks/useMergedRefs';
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
  defaultValue,
  value = defaultValue,
  onChangeValue,
  onUpdate,
  focused,
  className,
  ...nativeProps
}: InputWithTagsProps) {
  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(ref, inputRef);

  const {
    content,
    setContent,
    hint,
    showAutocomplete,
    setShowAutocomplete,
    keyPressed,
    setKeyPressed,
    handleKeyUp,
    handleKeyDown,
    handleMenuSelect,
    updateHint,
  } = useTagPopover(value?.toString() || '', onUpdate || (() => {}), ref);

  useEffect(() => {
    setContent(value?.toString() || '');
  }, [value, setContent]);

  const onChangeValueRef = useRef(onChangeValue);

  useEffect(() => {
    onChangeValueRef.current = onChangeValue;
  }, [onChangeValue]);

  useEffect(() => {
    if (content) {
      onChangeValueRef.current?.(content);
    }
  }, [content]);

  return (
    <>
      <input
        value={content}
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

          handleKeyDown?.(e);
        }}
        onKeyUp={handleKeyUp}
        onBlur={e => {
          onUpdate?.(content);
          nativeProps.onBlur?.(e);
        }}
        onChange={e => {
          setContent(e.target.value);
          onChangeValue?.(e.target.value);
          nativeProps.onChange?.(e);
        }}
        onFocus={() => updateHint(content)}
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
    </>
  );
}
