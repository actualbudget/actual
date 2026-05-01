import React, { useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent,
  FocusEventHandler,
  Ref,
} from 'react';

import { Input } from '@actual-app/components/input';
import { evalArithmetic } from '@actual-app/core/shared/arithmetic';

import { useFormat } from '#hooks/useFormat';
import { useMergedRefs } from '#hooks/useMergedRefs';

type PercentInputProps = {
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  value?: number;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onChangeValue?: (value: string) => void;
  onUpdatePercent?: (percent: number) => void;
  style?: CSSProperties;
  focused?: boolean;
  disabled?: boolean;
};

const clampToPercent = (value: number) => Math.max(Math.min(value, 100), 0);

export function PercentInput({
  id,
  inputRef,
  value: initialValue = 0,
  onFocus,
  onBlur,
  onChangeValue,
  onUpdatePercent,
  style,
  focused,
  disabled = false,
}: PercentInputProps) {
  const format = useFormat();

  // Internal number string (no % suffix) — avoids cursor-positioning issues
  // that arise when keeping a suffix inside a controlled input.
  const [numericStr, setNumericStr] = useState(() =>
    String(clampToPercent(initialValue)),
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const clampedInitialValue = clampToPercent(initialValue);
    if (clampedInitialValue !== initialValue) {
      setNumericStr(String(clampedInitialValue));
      onUpdatePercent?.(clampedInitialValue);
    }
  }, [initialValue, onUpdatePercent, format]);

  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);

  useEffect(() => {
    if (focused) {
      ref.current?.focus();
    }
  }, [focused]);

  function onInputTextChange(val: string) {
    const number = val.replace(/[^0-9.]/g, '');
    setNumericStr(number);
    onChangeValue?.(number);
  }

  function fireUpdate() {
    const clampedValue = clampToPercent(
      evalArithmetic(numericStr, 0) ?? 0,
    );
    onUpdatePercent?.(clampedValue);
    setNumericStr(String(clampedValue));
  }

  function onInputFocus(e: FocusEvent<HTMLInputElement>) {
    setIsFocused(true);
    onFocus?.(e);
  }

  function onInputAmountBlur(e: FocusEvent<HTMLInputElement>) {
    if (!ref.current?.contains(e.relatedTarget)) {
      fireUpdate();
    }
    setIsFocused(false);
    onBlur?.(e);
  }

  // Show plain number while editing; append '%' suffix when blurred so the
  // user always sees the full precision they entered.
  const displayValue = isFocused ? numericStr : format(numericStr || '0', 'percentage');

  return (
    <Input
      id={id}
      ref={mergedRef}
      inputMode="decimal"
      value={displayValue}
      disabled={disabled}
      style={{ flex: 1, alignItems: 'stretch', ...style }}
      onEnter={fireUpdate}
      onChangeValue={onInputTextChange}
      onBlur={onInputAmountBlur}
      onFocus={onInputFocus}
    />
  );
}
