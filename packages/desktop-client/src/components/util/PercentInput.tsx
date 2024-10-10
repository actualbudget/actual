import React, {
  useRef,
  useState,
  useEffect,
  type FocusEventHandler,
  type FocusEvent,
  type CSSProperties,
  forwardRef,
} from 'react';

import { evalArithmetic } from 'loot-core/src/shared/arithmetic';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { Input } from '../common/Input';
import { useFormat } from '../spreadsheet/useFormat';

type PercentInputProps = {
  id?: string;
  value?: number;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onChangeValue?: (value: string) => void;
  onUpdatePercent?: (percent: number) => void;
  style?: CSSProperties;
  autoFocus?: boolean;
  autoSelect?: boolean;
  disabled?: boolean;
};

const clampToPercent = (value: number) => Math.max(Math.min(value, 100), 0);

export const PercentInput = forwardRef<HTMLInputElement, PercentInputProps>(
  (
    {
      id,
      value: initialValue = 0,
      onFocus,
      onBlur,
      onChangeValue,
      onUpdatePercent,
      style,
      autoFocus,
      autoSelect,
      disabled = false,
    },
    ref,
  ) => {
    const format = useFormat();

    const [value, setValue] = useState(() =>
      format(clampToPercent(initialValue), 'percentage'),
    );
    useEffect(() => {
      const clampedInitialValue = clampToPercent(initialValue);
      if (clampedInitialValue !== initialValue) {
        setValue(format(clampedInitialValue, 'percentage'));
        onUpdatePercent?.(clampedInitialValue);
      }
    }, [initialValue, onUpdatePercent, format]);

    const inputRef = useRef<HTMLInputElement>(null);
    const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);

    function onSelectionChange() {
      if (!inputRef.current) {
        return;
      }

      const selectionStart = inputRef.current.selectionStart;
      const selectionEnd = inputRef.current.selectionEnd;
      if (
        selectionStart === selectionEnd &&
        selectionStart !== null &&
        selectionStart >= inputRef.current.value.length
      ) {
        inputRef.current.setSelectionRange(
          inputRef.current.value.length - 1,
          inputRef.current.value.length - 1,
        );
      }
    }

    function onInputTextChange(val: string) {
      const number = val.replace(/[^0-9.]/g, '');
      setValue(number ? format(number, 'percentage') : '');
      onChangeValue?.(number);
    }

    function fireUpdate() {
      const clampedValue = clampToPercent(
        evalArithmetic(value.replace('%', '')),
      );
      onUpdatePercent?.(clampedValue);
      onInputTextChange(String(clampedValue));
    }

    function onInputAmountBlur(e: FocusEvent<HTMLInputElement>) {
      if (!inputRef.current?.contains(e.relatedTarget)) {
        fireUpdate();
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
        autoFocus={autoFocus}
        autoSelect={autoSelect}
        style={{ flex: 1, alignItems: 'stretch', ...style }}
        onKeyUp={e => {
          if (e.key === 'Enter') {
            fireUpdate();
          }
        }}
        onChangeValue={onInputTextChange}
        onBlur={onInputAmountBlur}
        onFocus={onFocus}
        onSelect={onSelectionChange}
      />
    );
  },
);

PercentInput.displayName = 'PercentInput';
