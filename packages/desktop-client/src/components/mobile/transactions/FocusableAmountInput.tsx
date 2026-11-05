import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  FocusEvent,
  HTMLProps,
  Ref,
} from 'react';

import { Button } from '@actual-app/components/button';
import type { CSSProperties as EmotionCSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  amountToInteger,
  appendDecimals,
  currencyToAmount,
  reapplyThousandSeparators,
} from '@actual-app/core/shared/util';
import { css } from '@emotion/css';

import { makeAmountFullStyle } from '#components/budget/util';
import { useFormat } from '#hooks/useFormat';
import { useMergedRefs } from '#hooks/useMergedRefs';
import { useSyncedPref } from '#hooks/useSyncedPref';

type AmountInputProps = {
  value: number;
  focused?: boolean;
  style?: CSSProperties;
  textStyle?: CSSProperties;
  inputRef?: Ref<HTMLInputElement>;
  onFocus?: HTMLProps<HTMLInputElement>['onFocus'];
  onBlur?: HTMLProps<HTMLInputElement>['onBlur'];
  onEnter?: HTMLProps<HTMLInputElement>['onKeyUp'];
  onChangeValue?: (value: string) => void;
  onUpdate?: (value: string) => void;
  onUpdateAmount?: (value: number) => void;
};

const AmountInput = memo(function AmountInput({
  focused,
  style,
  textStyle,
  ...props
}: AmountInputProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [value, setValue] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretFromEnd = useRef<number | null>(null);
  const [hideFraction] = useSyncedPref('hideFraction');
  const format = useFormat();

  const mergedInputRef = useMergedRefs<HTMLInputElement>(
    props.inputRef,
    inputRef,
  );

  const initialValue = Math.abs(props.value);
  const formattedValue = format.forEdit(amountToInteger(value));
  // Show the real amount in the input so it can be selected and copied.
  // Zero stays empty so typed digits don't get appended to "0.00".
  const inputValue = editing ? text : value === 0 ? '' : formattedValue;

  useEffect(() => {
    if (focused) {
      inputRef.current?.focus();
    }
  }, [focused]);

  useEffect(() => {
    setEditing(false);
    setText('');
    setValue(initialValue);
  }, [initialValue]);

  // Reformatting moves the caret to the end; put it back before the same
  // number of digits it had in front of it.
  useLayoutEffect(() => {
    const input = inputRef.current;
    const digitsAfterCaret = caretFromEnd.current;
    caretFromEnd.current = null;
    if (!input || digitsAfterCaret === null) return;

    let caret = input.value.length;
    let digits = 0;
    while (caret > 0 && digits < digitsAfterCaret) {
      caret--;
      if (/\d/.test(input.value[caret])) digits++;
    }
    input.setSelectionRange(caret, caret);
  }, [text]);

  const onKeyUp: HTMLProps<HTMLInputElement>['onKeyUp'] = e => {
    if (e.key === 'Backspace' && text === '') {
      setEditing(true);
    } else if (e.key === 'Enter') {
      props.onEnter?.(e);
      if (!e.defaultPrevented) {
        onUpdate(e.currentTarget.value);
      }
    }
  };

  // Read from the DOM, not React state: onChange state updates flush
  // asynchronously, so an onBlur/onKeyUp fired by the user's next action
  // can see stale `text=''` and save 0 instead of the typed amount.
  const applyText = (rawInput?: string) => {
    const domText = rawInput ?? inputRef.current?.value ?? text;
    const parsed = currencyToAmount(domText) || 0;
    const hasPendingInput = editing || domText !== inputValue;
    const newValue = hasPendingInput ? parsed : value;

    setValue(Math.abs(newValue));
    setEditing(false);
    setText('');

    return newValue;
  };

  const onFocus: HTMLProps<HTMLInputElement>['onFocus'] = e => {
    props.onFocus?.(e);
    // Typing or pasting replaces the amount, like a regular input. Deferred
    // because iOS Safari ignores selection changes made during focus.
    const input = e.currentTarget;
    setTimeout(() => input.setSelectionRange(0, input.value.length), 0);
  };

  const onUpdate = (value: string) => {
    const originalAmount = Math.abs(props.value);
    const amount = applyText(value);
    if (amount !== originalAmount) {
      props.onUpdate?.(value);
      props.onUpdateAmount?.(amount);
    }
  };

  const onBlur: HTMLProps<HTMLInputElement>['onBlur'] = e => {
    props.onBlur?.(e);
    if (!e.defaultPrevented) {
      onUpdate(e.target.value);
    }
  };

  const updateText = (text: string) => {
    setEditing(true);
    setText(text);
    props.onChangeValue?.(text);
  };

  const onChangeText = (rawText: string, caret: number | null) => {
    caretFromEnd.current =
      caret === null ? null : rawText.slice(caret).replace(/\D/g, '').length;
    let text = rawText;
    if (format.currency.decimalPlaces === 0) {
      // Typed digits are whole units, whatever the hideFraction setting
      text = format.forEdit(amountToInteger(Number(text.replace(/\D/g, ''))));
    } else {
      text = appendDecimals(
        reapplyThousandSeparators(text),
        String(hideFraction) === 'true',
      );
    }
    updateText(text);
  };

  const onPaste: HTMLProps<HTMLInputElement>['onPaste'] = e => {
    // Only a full replacement is an amount ("12" is 12, not 0.12); with a
    // partial selection the browser inserts the text and onChange reformats.
    const input = e.currentTarget;
    if (
      input.selectionStart !== 0 ||
      input.selectionEnd !== input.value.length
    ) {
      return;
    }
    e.preventDefault();
    const amount = currencyToAmount(e.clipboardData.getData('text'));
    if (amount === null) return;
    updateText(format.forEdit(amountToInteger(Math.abs(amount))));
  };

  const input = (
    <input
      type="text"
      ref={mergedInputRef}
      value={inputValue}
      inputMode="decimal"
      autoCapitalize="none"
      onChange={e => onChangeText(e.target.value, e.target.selectionEnd)}
      onPaste={onPaste}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyUp={onKeyUp}
      data-testid="amount-input"
      style={{
        ...textStyle,
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: 5,
        border: 0,
        outline: 0,
        background: 'transparent',
        // The Text below draws the amount; the input only handles
        // selection, caret and editing.
        color: 'transparent',
        // An empty input would put the caret mid-box next to the Text's "0.00"
        caretColor: inputValue === '' ? 'transparent' : theme.pageText,
      }}
    />
  );

  return (
    <View
      style={{
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.pillBorderSelected,
        borderRadius: 4,
        padding: 5,
        backgroundColor: theme.tableBackground,
        maxWidth: 'calc(100% - 40px)',
        ...style,
      }}
    >
      {input}
      <Text
        style={{
          pointerEvents: 'none',
          ...textStyle,
        }}
        data-testid="amount-input-text"
      >
        {editing ? text || format.forEdit(0) : formattedValue}
      </Text>
    </View>
  );
});

export type FocusableAmountInputProps = Omit<AmountInputProps, 'onFocus'> & {
  sign?: '+' | '-';
  zeroSign?: '+' | '-';
  focused?: boolean;
  disabled?: boolean;
  focusedStyle?: CSSProperties;
  buttonProps?: Omit<ComponentPropsWithRef<typeof Button>, 'style'> & {
    style?: EmotionCSSProperties;
  };
  onFocus?: (event?: FocusEvent<HTMLInputElement>) => void;
};

export const FocusableAmountInput = memo(function FocusableAmountInput({
  value,
  sign,
  zeroSign,
  focused,
  disabled,
  textStyle,
  style,
  focusedStyle,
  buttonProps,
  onFocus,
  onBlur,
  onChangeValue,
  ...props
}: FocusableAmountInputProps) {
  const format = useFormat();
  const [isNegative, setIsNegative] = useState(true);
  const [liveValue, setLiveValue] = useState(Math.abs(value));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLiveValue(Math.abs(value));
  }

  const maybeApplyNegative = (amount: number, negative: boolean) => {
    const absValue = Math.abs(amount);
    return negative ? -absValue : absValue;
  };

  const onUpdateAmount = (amount: number, negative: boolean) => {
    props.onUpdateAmount?.(maybeApplyNegative(amount, negative));
  };

  const handleChangeValue = (text: string) => {
    setLiveValue(currencyToAmount(text) || 0);
    onChangeValue?.(text);
  };

  useEffect(() => {
    if (sign) {
      setIsNegative(sign === '-');
    } else if (value > 0 || (zeroSign !== '-' && value === 0)) {
      setIsNegative(false);
    }
  }, [sign, value, zeroSign]);

  const toggleIsNegative = () => {
    if (disabled) {
      return;
    }

    onUpdateAmount(value, !isNegative);
    setIsNegative(!isNegative);
  };

  return (
    <View>
      <AmountInput
        {...props}
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        onChangeValue={handleChangeValue}
        onUpdateAmount={amount => onUpdateAmount(amount, isNegative)}
        focused={focused && !disabled}
        style={{
          ...makeAmountFullStyle(maybeApplyNegative(liveValue, isNegative), {
            zeroColor: isNegative ? theme.numberNegative : theme.numberNeutral,
            positiveColor: theme.numberPositive,
            negativeColor: theme.numberNegative,
          }),
          width: 80,
          justifyContent: 'center',
          ...style,
          ...focusedStyle,
          ...(!focused && {
            display: 'none',
          }),
        }}
        textStyle={{ fontSize: 15, textAlign: 'right', ...textStyle }}
      />

      <View>
        {!focused && (
          <Button
            style={{
              position: 'absolute',
              right: 'calc(100% + 5px)',
              top: '8px',
            }}
            onPress={toggleIsNegative}
          >
            {isNegative ? '-' : '+'}
          </Button>
        )}
        <Button
          onPress={() => onFocus?.()}
          // Defines how far touch can start away from the button
          // hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          {...buttonProps}
          className={css({
            ...(buttonProps && buttonProps.style),
            ...(focused && { display: 'none' }),
            '&[data-pressed]': {
              backgroundColor: 'transparent',
            },
          })}
          variant="bare"
        >
          <View
            style={{
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: '#e0e0e0',
              borderTopColor: 'transparent',
              justifyContent: 'center',
              ...style,
            }}
          >
            <Text
              style={{
                ...makeAmountFullStyle(value, {
                  positiveColor: theme.numberPositive,
                  negativeColor: theme.numberNegative,
                  zeroColor: theme.numberNeutral,
                }),
                fontSize: 15,
                userSelect: 'none',
                ...textStyle,
              }}
            >
              {format.forEdit(amountToInteger(Math.abs(value)))}
            </Text>
          </View>
        </Button>
      </View>
    </View>
  );
});
