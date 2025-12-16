import {
  type Ref,
  type ComponentPropsWithRef,
  type HTMLProps,
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  amountToCurrency,
  appendDecimals,
  currencyToAmount,
  reapplyThousandSeparators,
} from 'loot-core/shared/util';

import { makeAmountFullStyle } from '@desktop-client/components/budget/util';
import { MoneyKeypad } from '@desktop-client/components/util/MoneyKeypad';
import { useIsMobileCalculatorKeypadEnabled } from '@desktop-client/hooks/useIsMobileCalculatorKeypadEnabled';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { parseAmountExpression } from '@desktop-client/util/parseAmountExpression';

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
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [value, setValue] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobileKeypadEnabled = useIsMobileCalculatorKeypadEnabled();
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const isKeypadOpenRef = useRef(false);
  const didCommitFromKeypadRef = useRef(false);
  const [hideFraction] = useSyncedPref('hideFraction');

  const mergedInputRef = useMergedRefs<HTMLInputElement>(
    props.inputRef,
    inputRef,
  );

  const initialValue = Math.abs(props.value);

  useEffect(() => {
    if (focused) {
      if (isMobileKeypadEnabled) {
        // On mobile, open the custom keypad instead of the OS keyboard.
        isKeypadOpenRef.current = true;
        setIsKeypadOpen(true);
        setEditing(true);
        setText(initialValue === 0 ? '' : amountToCurrency(initialValue));
      } else {
        inputRef.current?.focus();
      }
    }
  }, [focused, isMobileKeypadEnabled, initialValue]);

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
    const parsed = currencyToAmount(text) || 0;
    const newValue = editing ? parsed : value;

    setValue(Math.abs(newValue));
    setEditing(false);
    setText('');

    return newValue;
  };

  const notifyParentBlur = () => {
    props.onBlur?.(
      new FocusEvent('blur') as unknown as FocusEvent<HTMLInputElement>,
    );
  };

  const parseExpression = (expr: string): number | null => {
    const trimmed = expr.trim();
    if (trimmed === '') {
      return 0;
    }

    const numericValue = parseAmountExpression(trimmed);
    if (numericValue === null) {
      return null;
    }

    // This component handles the sign separately (via FocusableAmountInput),
    // so normalize to absolute here.
    return Math.abs(numericValue);
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

    if (isMobileKeypadEnabled && isKeypadOpenRef.current) {
      return;
    }

    if (!e.defaultPrevented) {
      onUpdate(e.target.value);
    }
  };

  const onChangeText = (text: string) => {
    if (isMobileKeypadEnabled) {
      // The custom keypad owns editing on mobile.
      return;
    }

    text = reapplyThousandSeparators(text);
    text = appendDecimals(text, String(hideFraction) === 'true');
    setEditing(true);
    setText(text);
    props.onChangeValue?.(text);
  };

  const input = (
    <input
      type="text"
      ref={mergedInputRef}
      value={text}
      inputMode={isMobileKeypadEnabled ? 'none' : 'decimal'}
      autoCapitalize="none"
      onChange={e => onChangeText(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
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

      {isMobileKeypadEnabled && focused && isKeypadOpen && (
        <MoneyKeypad
          modalName="money-keypad"
          title={t('Amount')}
          defaultValue={text}
          onChangeValue={nextText => {
            setEditing(true);
            setText(nextText);
            props.onChangeValue?.(nextText);
          }}
          onEvaluate={expr => {
            const parsed = parseExpression(expr);
            if (parsed == null) {
              return { ok: false as const, error: t('Invalid expression') };
            }

            return {
              ok: true as const,
              value: amountToCurrency(parsed),
            };
          }}
          onDone={expr => {
            const parsed = parseExpression(expr);
            if (parsed == null) {
              return { ok: false as const, error: t('Invalid expression') };
            }

            setValue(parsed);
            setEditing(false);
            setText('');

            const originalAmount = Math.abs(props.value);
            if (parsed !== originalAmount) {
              props.onUpdate?.(String(parsed));
              props.onUpdateAmount?.(parsed);
            }

            didCommitFromKeypadRef.current = true;
            isKeypadOpenRef.current = false;
            setIsKeypadOpen(false);
            notifyParentBlur();

            return { ok: true as const, value: undefined };
          }}
          onClose={() => {
            if (didCommitFromKeypadRef.current) {
              didCommitFromKeypadRef.current = false;
              isKeypadOpenRef.current = false;
              setIsKeypadOpen(false);
              return;
            }

            isKeypadOpenRef.current = false;
            setIsKeypadOpen(false);
            setEditing(false);
            setText('');
            notifyParentBlur();
          }}
        />
      )}

      <Text
        style={{
          pointerEvents: 'none',
          ...textStyle,
        }}
        data-testid="amount-input-text"
      >
        {editing ? text : amountToCurrency(value)}
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
          data-testid="amount-display"
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
