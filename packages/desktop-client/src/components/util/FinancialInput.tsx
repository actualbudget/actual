import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, MouseEvent } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import type { InputProps } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import { css, cx } from '@emotion/css';

import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

// In privacy mode the amount renders in the redaction font, with the same
// reveal affordance as PrivacyFilter: squiggles at rest, readable while
// hovered or being edited
const REDACTED_INPUT_CLASS = css({
  '&:not(:focus):not(:hover)': { fontFamily: 'Redacted Script' },
});

type FinancialInputProps = Omit<
  InputProps,
  'value' | 'onUpdate' | 'onChangeValue' | 'onEnter'
> & {
  value: IntegerAmount;
  onUpdate?: (value: IntegerAmount) => void;
  onChangeValue?: (value: IntegerAmount) => void;
  onEnter?: (value: IntegerAmount) => void;
};

export function FinancialInput({
  ref,
  value: integerValue,
  onUpdate,
  onChangeValue,
  onBlur,
  onFocus,
  onMouseUp,
  onEnter,
  className,
  ...restProps
}: FinancialInputProps) {
  const format = useFormat();
  const privacyMode = usePrivacyMode();
  // Like PrivacyFilter, redaction is desktop-only for now
  const { isNarrowWidth } = useResponsive();
  const inputRef = useRef<HTMLInputElement>(null);
  // Set on focus and cleared by the first mouse-up, so a click that
  // focuses the field keeps the whole value selected (see handleMouseUp)
  const didJustFocus = useRef(false);
  const [internalValue, setInternalValue] = useState(() =>
    format(integerValue, 'financial'),
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInternalValue(format(integerValue, 'financial'));
    }
  }, [integerValue, format, isFocused]);

  // Highlight the whole value on focus so typing replaces it. Focusing
  // swaps the text to its edit form, which would collapse a selection
  // made in the focus handler, so select once React has committed the
  // swap - still synchronously within the focus event, so nothing runs
  // after the user has moved on (a deferred select() would steal focus
  // back and set two fields bouncing focus between each other)
  useLayoutEffect(() => {
    if (isFocused) {
      inputRef.current?.select();
    }
  }, [isFocused]);

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setInternalValue(format.forEdit(integerValue));
    // The selection itself is made in the layout effect above
    didJustFocus.current = true;
    onFocus?.(e);
  };

  const handleMouseUp = (e: MouseEvent<HTMLInputElement>) => {
    // The browser's mouse-up would otherwise replace the selection made
    // on focus with a caret at the click point; later clicks in an
    // already-focused field place the caret as normal
    if (didJustFocus.current) {
      e.preventDefault();
      didJustFocus.current = false;
    }
    onMouseUp?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const finalInteger = format.fromEdit(internalValue, 0) ?? 0;
    // Only report a real change: tabbing through an untouched field is
    // not an update, and callers may do expensive work on one
    if (finalInteger !== integerValue) {
      onUpdate?.(finalInteger);
    }
    setInternalValue(format(finalInteger, 'financial'));
    onBlur?.(e);
  };

  const handleEnter = (stringValue: string) => {
    const finalInteger = format.fromEdit(stringValue, 0) ?? 0;
    if (finalInteger !== integerValue) {
      onUpdate?.(finalInteger);
    }
    onEnter?.(finalInteger);
  };

  const handleChange = (stringValue: string) => {
    setInternalValue(stringValue);

    if (onChangeValue) {
      const newInteger = format.fromEdit(stringValue, 0) ?? 0;
      onChangeValue(newInteger);
    }
  };

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;

    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  return (
    <Input
      {...restProps}
      ref={setInputRef}
      value={internalValue || ''}
      className={
        privacyMode && !isNarrowWidth
          ? // The caller's className may be react-aria's function form, so
            // compose through it rather than assuming a string
            renderProps =>
              cx(
                typeof className === 'function'
                  ? className(renderProps)
                  : className,
                REDACTED_INPUT_CLASS,
              )
          : className
      }
      style={{ ...restProps.style, ...styles.tnum }}
      onChangeValue={handleChange}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onBlur={handleBlur}
      onEnter={handleEnter}
    />
  );
}
