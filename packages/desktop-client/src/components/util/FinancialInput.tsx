import { useEffect, useRef, useState } from 'react';
import type { FocusEvent } from 'react';

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
  onEnter,
  className,
  ...restProps
}: FinancialInputProps) {
  const format = useFormat();
  const privacyMode = usePrivacyMode();
  // Like PrivacyFilter, redaction is desktop-only for now
  const { isNarrowWidth } = useResponsive();
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(() =>
    format(integerValue, 'financial'),
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInternalValue(format(integerValue, 'financial'));
    }
  }, [integerValue, format, isFocused]);

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setInternalValue(format.forEdit(integerValue));
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
    onFocus?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const finalInteger = format.fromEdit(internalValue, 0) ?? 0;
    onUpdate?.(finalInteger);
    setInternalValue(format(finalInteger, 'financial'));
    onBlur?.(e);
  };

  const handleEnter = (stringValue: string) => {
    const finalInteger = format.fromEdit(stringValue, 0) ?? 0;
    onUpdate?.(finalInteger);
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
      onBlur={handleBlur}
      onEnter={handleEnter}
    />
  );
}
