import {
  forwardRef,
  useState,
  useEffect,
  useRef,
  type ForwardedRef,
  type FocusEvent,
} from 'react';

import { Input, type InputProps } from '@actual-app/components/input';

import { type IntegerAmount } from 'loot-core/shared/util';

import { useFormat } from '@desktop-client/hooks/useFormat';

type FinancialInputProps = Omit<
  InputProps,
  'value' | 'onUpdate' | 'onChangeValue' | 'onEnter'
> & {
  value: IntegerAmount;
  onUpdate?: (value: IntegerAmount) => void;
  onChangeValue?: (value: IntegerAmount) => void;
  onEnter?: (value: IntegerAmount) => void;
};

export const FinancialInput = forwardRef<HTMLInputElement, FinancialInputProps>(
  function FinancialInput(
    {
      value: integerValue,
      onUpdate,
      onChangeValue,
      onBlur,
      onEnter,
      ...restProps
    },
    ref: ForwardedRef<HTMLInputElement>,
  ) {
    const format = useFormat();
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

    const handleFocus = () => {
      setIsFocused(true);
      setInternalValue(format.forEdit(integerValue));
      setTimeout(() => {
        inputRef.current?.select();
      }, 0);
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

    const setInputRef = (node: HTMLInputElement) => {
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
        onChangeValue={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onEnter={handleEnter}
      />
    );
  },
);
