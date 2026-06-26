import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, FocusEventHandler, Ref } from 'react';

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
  max?: number;
};

const clampToPercent = (value: number, max: number) =>
  Math.max(Math.min(value, max), 0);

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
  max = 100,
}: PercentInputProps) {
  const format = useFormat();

  const [isFocused, setIsFocused] = useState(focused ?? false);
  const [value, setValue] = useState(() =>
    format(clampToPercent(initialValue, max), 'percentage'),
  );

  useEffect(() => {
    const clamped = clampToPercent(initialValue, max);
    if (clamped !== initialValue) {
      onUpdatePercent?.(clamped);
    }
    // drop the symbol while editing so the value can be edited freely
    setValue(isFocused ? String(clamped) : format(clamped, 'percentage'));
  }, [initialValue, max, isFocused, onUpdatePercent, format]);

  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);

  useEffect(() => {
    if (focused) {
      ref.current?.focus();
    }
  }, [focused]);

  function onInputTextChange(val: string) {
    const number = val.replace(/[^0-9.]/g, '');
    setValue(number);
    onChangeValue?.(number);
  }

  function fireUpdate() {
    const clamped = clampToPercent(
      evalArithmetic(value.replace('%', ''), 0) ?? 0,
      max,
    );
    onUpdatePercent?.(clamped);
    return clamped;
  }

  function onInputFocus(e: FocusEvent<HTMLInputElement>) {
    setIsFocused(true);
    onFocus?.(e);
  }

  function onInputBlur(e: FocusEvent<HTMLInputElement>) {
    if (!ref.current?.contains(e.relatedTarget)) {
      const clamped = fireUpdate();
      setIsFocused(false);
      setValue(format(clamped, 'percentage'));
    }
    onBlur?.(e);
  }

  return (
    <Input
      id={id}
      ref={mergedRef}
      inputMode="decimal"
      value={value}
      disabled={disabled}
      style={{ flex: 1, alignItems: 'stretch', ...style }}
      onEnter={fireUpdate}
      onChangeValue={onInputTextChange}
      onBlur={onInputBlur}
      onFocus={onInputFocus}
    />
  );
}
