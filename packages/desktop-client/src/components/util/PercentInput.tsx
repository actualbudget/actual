import React, {
  type Ref,
  useRef,
  useState,
  useEffect,
  type FocusEventHandler,
} from 'react';

import { evalArithmetic } from 'loot-core/src/shared/arithmetic';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { type CSSProperties } from '../../style';
import { Input } from '../common/Input';
import { useFormat } from '../spreadsheet/useFormat';

type AmountInputProps = {
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  value: number;
  onChangeValue?: (value: string) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onUpdate?: (amount: number) => void;
  style?: CSSProperties;
  focused?: boolean;
  disabled?: boolean;
};

export function PercentInput({
  id,
  inputRef,
  value: initialValue,
  onFocus,
  onBlur,
  onChangeValue,
  onUpdate,
  style,
  focused,
  disabled = false,
}: AmountInputProps) {
  const format = useFormat();

  const initialValueAbsolute = format(initialValue || 0, 'percentage');
  const [value, setValue] = useState(initialValueAbsolute);
  useEffect(() => setValue(initialValueAbsolute), [initialValueAbsolute]);

  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);

  useEffect(() => {
    if (focused) {
      ref.current?.focus();
    }
  }, [focused]);

  function onSelectionChange(e) {
    const selectionStart = e.target.selectionStart;
    const selectionEnd = e.target.selectionEnd;
    if (
      selectionStart === selectionEnd &&
      selectionStart >= e.target.value.length
    ) {
      e.target.setSelectionRange(
        e.target.value.length - 1,
        e.target.value.length - 1,
      );
    }
  }

  function onInputTextChange(val) {
    const number = val.replace(/[^0-9.]/g, '');
    console.log(val);

    setValue(number ? format(number, 'percentage') : '');
    onChangeValue?.(number);

    const selectionStart = ref.current?.selectionStart;
    const selectionEnd = ref.current?.selectionEnd;
    console.log(selectionStart, selectionEnd, val.length);
    if (selectionStart === selectionEnd && selectionStart >= val.length) {
      console.log('set range to', val.length - 1, val.length - 1);
      ref.current?.setSelectionRange(val.length - 1, val.length - 1);
    }
  }

  function fireUpdate() {
    const valueOrInitial = Math.max(
      Math.min(evalArithmetic(value.replace('%', '')), 100),
      0,
    );
    onUpdate?.(valueOrInitial);
  }

  function onInputAmountBlur(e) {
    if (!ref.current?.contains(e.relatedTarget)) {
      fireUpdate();
    }
    onBlur?.(e);
  }

  return (
    <Input
      id={id}
      inputRef={mergedRef}
      inputMode="decimal"
      value={value}
      disabled={disabled}
      focused={focused}
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
}
