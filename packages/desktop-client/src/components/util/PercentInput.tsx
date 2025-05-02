import React, {
  type Ref,
  useRef,
  useState,
  useEffect,
  type FocusEventHandler,
  type FocusEvent,
  type CSSProperties,
  useCallback,
} from 'react';

import { Input } from '@actual-app/components/input';

import { evalArithmetic } from 'loot-core/shared/arithmetic';

import { useFormat } from '../spreadsheet/useFormat';

import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';

type PercentInputProps = {
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  value?: number;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  // onChangeValue?: (value: string) => void;
  onUpdatePercent?: (percent: number) => void;
  style?: CSSProperties;
  // focused?: boolean;
  disabled?: boolean;
};

const clampToPercent = (value: number) => Math.max(Math.min(value, 100), 0);

export function PercentInput({
  id,
  inputRef,
  value: initialValue = 0,
  onFocus: parentOnFocus,
  onBlur: parentOnBlur,
  // onChangeValue,
  onUpdatePercent,
  style,
  // focused,
  disabled = false,
}: PercentInputProps) {
  const format = useFormat();

  const [rawValue, setRawValue] = useState(() =>
    String(clampToPercent(initialValue)),
  );
  const [isFocused, setIsFocused] = useState(false);

  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);

  useEffect(() => {
    if (!isFocused) {
      const clampedInitialValue = clampToPercent(initialValue);
      const initialValueStr = String(clampedInitialValue);
      if (initialValueStr !== rawValue) {
        setRawValue(initialValueStr);
      }
    }
  }, [initialValue, isFocused]);

  useEffect(() => {
    const clampedInitialValue = clampToPercent(initialValue);
    if (clampedInitialValue !== initialValue) {
      onUpdatePercent?.(clampedInitialValue);
    }
  }, [initialValue, onUpdatePercent]);

  const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setRawValue(String(clampToPercent(initialValue)));
    e.target.select();
    parentOnFocus?.(e);
  }, [parentOnFocus, initialValue]);

  const processValueAndUpdate = useCallback(() => {
    const parsed = evalArithmetic(rawValue);
    const clampedValue = clampToPercent(parsed == null || isNaN(parsed) ? 0 : parsed);
    const clampedValueStr = String(clampedValue);

    const initialClamped = clampToPercent(initialValue);
    if (Math.abs(clampedValue - initialClamped) > 1e-9) {
       onUpdatePercent?.(clampedValue);
    }

    if (clampedValueStr !== rawValue) {
        setRawValue(clampedValueStr);
    }
    return clampedValueStr;
  }, [rawValue, onUpdatePercent, initialValue]);

  const handleBlur = useCallback((e: FocusEvent<HTMLInputElement>) => {
    processValueAndUpdate();
    setIsFocused(false);
    parentOnBlur?.(e);
  }, [parentOnBlur, processValueAndUpdate]);

  const handleInputTextChange = useCallback((val: string) => {
    let number = val.replace(/[^0-9.]/g, '');
    const decimalParts = number.split('.');
    if (decimalParts.length > 2) {
      number = decimalParts[0] + '.' + decimalParts.slice(1).join('');
    }
    setRawValue(number);
  }, []);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      processValueAndUpdate();
      ref.current?.blur();
    } else if (e.key === 'Escape') {
      setRawValue(String(clampToPercent(initialValue)));
      ref.current?.blur();
    }
  }, [processValueAndUpdate, initialValue]);

  const displayValue = isFocused
                         ? rawValue
                         : format(initialValue, 'percentage');

  return (
    <Input
      id={id}
      inputRef={mergedRef}
      inputMode="decimal"
      value={displayValue}
      disabled={disabled}
      style={{ flex: 1, alignItems: 'stretch', ...style }}
      onKeyUp={handleKeyUp}
      onChangeValue={handleInputTextChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      // onSelect={onSelectionChange}
    />
  );
}
