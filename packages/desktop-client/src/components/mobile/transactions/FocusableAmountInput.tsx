import React, { memo, useEffect, useRef, useState } from 'react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  HTMLProps,
  Ref,
} from 'react';

import { Button } from '@actual-app/components/button';
import type { CSSProperties as EmotionCSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  amountToCurrency,
  appendDecimals,
  currencyToAmount,
  reapplyThousandSeparators,
} from '@actual-app/core/shared/util';
import { css } from '@emotion/css';

import { makeAmountFullStyle } from '#components/budget/util';
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
  const [hideFraction] = useSyncedPref('hideFraction');

  const mergedInputRef = useMergedRefs<HTMLInputElement>(
    props.inputRef,
    inputRef,
  );

  const initialValue = Math.abs(props.value);

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
    const hasPendingInput = domText !== '' || editing;
    const newValue = hasPendingInput ? parsed : value;

    setValue(Math.abs(newValue));
    setEditing(false);
    setText('');

    return newValue;
  };

  const onFocus: HTMLProps<HTMLInputElement>['onFocus'] = e => {
    // Move the current amount into the input so the field behaves like a
    // regular HTML input: the value can be selected, copied and replaced
    // by typing or pasting. Select it all (deferred so the value is in the
    // DOM first), matching the desktop AmountInput behaviour.
    setEditing(true);
    setText(amountToCurrency(value));
    requestAnimationFrame(() => inputRef.current?.select());
    props.onFocus?.(e);
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

  const onChangeText = (text: string) => {
    text = reapplyThousandSeparators(text);
    text = appendDecimals(text, String(hideFraction) === 'true');
    setEditing(true);
    setText(text);
    props.onChangeValue?.(text);
  };

  // The input holds the displayed amount so it acts like a real input
  // (selectable/copyable/pasteable). It overlays an invisible Text sizer
  // that keeps the box width matched to the formatted amount.
  const displayText = editing
    ? text || amountToCurrency(0)
    : amountToCurrency(value);

  const input = (
    <input
      type="text"
      ref={mergedInputRef}
      value={editing ? text : amountToCurrency(value)}
      inputMode="decimal"
      autoCapitalize="none"
      onChange={e => onChangeText(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyUp={onKeyUp}
      data-testid="amount-input"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 0,
        margin: 0,
        padding: 0,
        backgroundColor: 'transparent',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'center',
        ...textStyle,
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
        aria-hidden
        style={{
          visibility: 'hidden',
          pointerEvents: 'none',
          ...textStyle,
        }}
        data-testid="amount-input-text"
      >
        {displayText}
      </Text>
    </View>
  );
});

type FocusableAmountInputProps = Omit<AmountInputProps, 'onFocus'> & {
  sign?: '+' | '-';
  zeroSign?: '+' | '-';
  focused?: boolean;
  disabled?: boolean;
  focusedStyle?: CSSProperties;
  buttonProps?: Omit<ComponentPropsWithRef<typeof Button>, 'style'> & {
    style?: EmotionCSSProperties;
  };
  onFocus?: () => void;
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
  const [isNegative, setIsNegative] = useState(true);
  const [liveValue, setLiveValue] = useState(Math.abs(value));

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
    setLiveValue(Math.abs(value));
  }, [value]);

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
          onPress={onFocus}
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
              {amountToCurrency(Math.abs(value))}
            </Text>
          </View>
        </Button>
      </View>
    </View>
  );
});
