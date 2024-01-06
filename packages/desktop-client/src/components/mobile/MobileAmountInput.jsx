import { memo, useEffect, useRef, useState } from 'react';

import {
  toRelaxedNumber,
  amountToCurrency,
  getNumberFormat,
} from 'loot-core/src/shared/util';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { theme } from '../../style';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { View } from '../common/View';

const AmountInput = memo(function AmountInput({
  focused,
  style,
  textStyle,
  ...props
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [value, setValue] = useState(0);
  const inputRef = useRef();
  const mergedInputRef = useMergedRefs(props.inputRef, inputRef);

  const getInitialValue = () => Math.abs(props.value);

  useEffect(() => {
    if (focused) {
      focus();
    }
  }, []);

  useEffect(() => {
    if (focused) {
      focus();
    }
  }, [focused]);

  useEffect(() => {
    setEditing(false);
    setText('');
    setValue(getInitialValue());
  }, [props.value]);

  const parseText = () => {
    return toRelaxedNumber(text.replace(/[,.]/, getNumberFormat().separator));
  };

  const onKeyPress = e => {
    if (e.key === 'Backspace' && text === '') {
      setEditing(true);
    }
  };

  const focus = () => {
    inputRef.current?.focus();
    setValue(getInitialValue());
  };

  const applyText = () => {
    const parsed = parseText();
    const newValue = editing ? parsed : value;

    setValue(Math.abs(newValue));
    setEditing(false);
    setText('');

    return newValue;
  };

  const onFocus = e => {
    props.onFocus?.(e);
  };

  const onBlur = e => {
    const value = applyText();
    props.onUpdate?.(value);
    props.onBlur?.(e);
  };

  const onChangeText = text => {
    setEditing(true);
    setText(text);
    props.onChange?.(text);
  };

  const input = (
    <input
      type="text"
      ref={mergedInputRef}
      value={text}
      inputMode="decimal"
      autoCapitalize="none"
      onChange={e => onChangeText(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyUp={onKeyPress}
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
        ...style,
      }}
    >
      <View style={{ overflowY: 'auto', overflowX: 'hidden' }}>{input}</View>
      <Text
        style={textStyle}
        data-testid="amount-fake-input"
        pointerEvents="none"
      >
        {editing ? text : amountToCurrency(value)}
      </Text>
    </View>
  );
});

export const FocusableAmountInput = memo(function FocusableAmountInput({
  value,
  sign, // + or -
  zeroSign, // + or -
  focused,
  textStyle,
  style,
  focusedStyle,
  buttonProps,
  onFocus,
  onBlur,
  ...props
}) {
  const [isNegative, setIsNegative] = useState(true);

  useEffect(() => {
    if (sign) {
      setIsNegative(sign === '-');
    } else if (value > 0 || (zeroSign !== '-' && value === 0)) {
      setIsNegative(false);
    }
  }, []);

  const toggleIsNegative = () => {
    setIsNegative(!isNegative);
    props.onUpdate?.(maybeApplyNegative(value, !isNegative));
  };

  const maybeApplyNegative = (val, negative) => {
    const absValue = Math.abs(val);
    return negative ? -absValue : absValue;
  };

  const onUpdate = val => {
    props.onUpdate?.(maybeApplyNegative(val, isNegative));
  };

  const onChange = val => {
    props.onChange?.(maybeApplyNegative(val, isNegative));
  };

  return (
    <View>
      <AmountInput
        {...props}
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={onChange}
        onUpdate={onUpdate}
        focused={focused}
        style={{
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
            onClick={toggleIsNegative}
          >
            {isNegative ? '-' : '+'}
          </Button>
        )}
        <Button
          onClick={onFocus}
          // Defines how far touch can start away from the button
          // hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          {...buttonProps}
          style={{
            ...(buttonProps && buttonProps.style),
            ...(focused && { display: 'none' }),
            ':hover': {
              backgroundColor: 'transparent',
            },
          }}
          type="bare"
        >
          <View
            style={{
              borderBottomWidth: 1,
              borderColor: '#e0e0e0',
              justifyContent: 'center',
              transform: [{ translateY: 0.5 }],
              ...style,
            }}
          >
            <Text style={{ fontSize: 15, userSelect: 'none', ...textStyle }}>
              {amountToCurrency(Math.abs(value))}
            </Text>
          </View>
        </Button>
      </View>
    </View>
  );
});
