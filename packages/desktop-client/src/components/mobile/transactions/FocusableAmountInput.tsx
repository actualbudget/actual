import React, {
  type Ref,
  type ComponentPropsWithRef,
  type HTMLProps,
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  evalArithmetic,
  hasArithmeticOperator,
  lastIndexOfArithmeticOperator,
} from 'loot-core/shared/arithmetic';
import {
  amountToCurrency,
  amountToInteger,
  appendDecimals,
  currencyToAmount,
  reapplyThousandSeparators,
} from 'loot-core/shared/util';

import { makeAmountFullStyle } from '@desktop-client/components/budget/util';
import {
  AmountKeyboard,
  type AmountKeyboardRef,
} from '@desktop-client/components/util/AmountKeyboard';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

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
  const [hideFractionPref] = useSyncedPref('hideFraction');

  const mergedInputRef = useMergedRefs<HTMLInputElement>(
    props.inputRef,
    inputRef,
  );

  const initialValue = Math.abs(props.value);
  const keyboardRef = useRef<AmountKeyboardRef | null>(null);

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

  const applyText = () => {
    const parsed = (hasArithmeticOperator(text)
      ? evalArithmetic(text)
      : currencyToAmount(text)) ?? 0;

    const newValue = editing ? parsed : value;

    setValue(Math.abs(newValue));
    setEditing(false);
    setText('');

    return newValue;
  };

  const onFocus: HTMLProps<HTMLInputElement>['onFocus'] = e => {
    props.onFocus?.(e);
  };

  const onUpdate = (value: string) => {
    const originalAmount = Math.abs(props.value);
    const amount = applyText();
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
    const hideFraction = String(hideFractionPref) === 'true';
    const lastOperatorIndex = lastIndexOfArithmeticOperator(text);
    if (lastOperatorIndex > 0) {
      // This will evaluate the expression whenever an operator is added
      // so only one operation will be displayed at a given time
      const isOperatorAtEnd = lastOperatorIndex === text.length - 1;
      if (isOperatorAtEnd) {
        const lastOperator = text[lastOperatorIndex];
        const charIndexPriorToLastOperator = lastOperatorIndex - 1;
        const charPriorToLastOperator =
          text.length > 0 ? text[charIndexPriorToLastOperator] : '';

        if (
          charPriorToLastOperator &&
          hasArithmeticOperator(charPriorToLastOperator)
        ) {
          // Clicked on another operator while there is still an operator
          // Replace previous operator with the new one
          text = `${text.slice(0, charIndexPriorToLastOperator)}${lastOperator}`;
        } else {
          // Evaluate the left side of the expression whenever an operator is added
          const left = text.slice(0, lastOperatorIndex);
          const leftEvaluated = evalArithmetic(left) ?? 0;
          const leftEvaluatedWithDecimal = appendDecimals(
            reapplyThousandSeparators(String(amountToInteger(leftEvaluated))),
            hideFraction,
          );
          text = `${leftEvaluatedWithDecimal}${lastOperator}`;
        }
      } else {
        // Append decimals to the right side of the expression
        const left = text.slice(0, lastOperatorIndex);
        const right = text.slice(lastOperatorIndex + 1);
        const lastOperator = text[lastOperatorIndex];
        const rightWithDecimal = appendDecimals(
          reapplyThousandSeparators(right),
          hideFraction,
        );
        text = `${left}${lastOperator}${rightWithDecimal}`;
      }
    } else {
      text = appendDecimals(reapplyThousandSeparators(text), hideFraction);
    }
    setEditing(true);
    setText(text);
    keyboardRef.current?.setInput(text);
    props.onChangeValue?.(text);
  };

  const input = (
    <input
      type="text"
      ref={mergedInputRef}
      value={text}
      inputMode="none"
      autoCapitalize="none"
      onChange={e => onChangeText(e.target.value)}
      onFocus={onFocus}
      onBlur={e => {
        // Do not blur when clicking on the keyboard elements
        if (keyboardRef.current?.keyboardDOM.contains(e.relatedTarget)) {
          return;
        }
        onBlur(e);
      }}
      onKeyUp={onKeyUp}
      data-testid="amount-input"
      style={{ flex: 1, textAlign: 'center', position: 'absolute' }}
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
      <View style={{ overflowY: 'auto', overflowX: 'hidden' }}>{input}</View>
      <Text
        style={{
          pointerEvents: 'none',
          ...textStyle,
        }}
        data-testid="amount-input-text"
      >
        {editing ? text : amountToCurrency(value)}
      </Text>
      {focused && (
        <AmountKeyboard
          keyboardRef={(r: AmountKeyboardRef) => (keyboardRef.current = r)}
          onChange={onChangeText}
          onBlur={onBlur}
          onEnter={onUpdate}
        />
      )}
    </View>
  );
});

type FocusableAmountInputProps = Omit<AmountInputProps, 'onFocus'> & {
  sign?: '+' | '-';
  zeroSign?: '+' | '-';
  focused?: boolean;
  disabled?: boolean;
  focusedStyle?: CSSProperties;
  buttonProps?: ComponentPropsWithRef<typeof Button>;
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
  ...props
}: FocusableAmountInputProps) {
  const [isNegative, setIsNegative] = useState(true);

  const maybeApplyNegative = (amount: number, negative: boolean) => {
    const absValue = Math.abs(amount);
    return negative ? -absValue : absValue;
  };

  const onUpdateAmount = (amount: number, negative: boolean) => {
    props.onUpdateAmount?.(maybeApplyNegative(amount, negative));
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
        onUpdateAmount={amount => onUpdateAmount(amount, isNegative)}
        focused={focused && !disabled}
        style={{
          ...makeAmountFullStyle(value, {
            zeroColor: isNegative ? theme.errorText : theme.noticeText,
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
              borderBottomWidth: 1,
              borderColor: '#e0e0e0',
              justifyContent: 'center',
              ...style,
            }}
          >
            <Text
              style={{
                ...makeAmountFullStyle(value),
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
