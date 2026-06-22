import React from 'react';
import type { ReactNode, RefObject } from 'react';

import { Button } from '@actual-app/components/button';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export function CalculatorButtons({
  inputRef,
  style,
  onInteractionStart,
  ...props
}: {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onClear: () => void;
  readonly onEquals: () => void;
  readonly onInteractionStart?: () => void;
  readonly style?: CSSProperties;
}) {
  const focusInputAt = (position: number) => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });
    input.setSelectionRange(position, position);
  };

  const focusInput = () => {
    inputRef.current?.focus({ preventScroll: true });
  };

  const getSelection = () => {
    const input = inputRef.current;
    const currentExpression = input?.value ?? '';
    const start = input?.selectionStart ?? currentExpression.length;
    const end = input?.selectionEnd ?? start;

    return { currentExpression, start, end };
  };

  const updateExpression = (nextExpression: string, caretPosition: number) => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    setNativeInputValue(input, nextExpression);
    focusInputAt(caretPosition);
  };

  const insertExpression = (value: string) => {
    const { currentExpression, start, end } = getSelection();

    updateExpression(
      currentExpression.slice(0, start) + value + currentExpression.slice(end),
      start + value.length,
    );
  };

  const backspace = () => {
    const { currentExpression, start, end } = getSelection();

    if (start !== end) {
      updateExpression(
        currentExpression.slice(0, start) + currentExpression.slice(end),
        start,
      );
      return;
    }

    if (start === 0) {
      updateExpression(currentExpression, start);
      return;
    }

    updateExpression(
      currentExpression.slice(0, start - 1) + currentExpression.slice(start),
      start - 1,
    );
  };

  return (
    <View style={{ ...style, gap: 12 }}>
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)',
          gap: 6,
          height: '100%',
        }}
      >
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            focusInput();
            props.onClear();
          }}
        >
          AC
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('(');
          }}
        >
          (
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression(')');
          }}
        >
          )
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('/');
          }}
        >
          {'\u00F7'}
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('7');
          }}
        >
          7
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('8');
          }}
        >
          8
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('9');
          }}
        >
          9
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('*');
          }}
        >
          {'\u00D7'}
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('4');
          }}
        >
          4
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('5');
          }}
        >
          5
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('6');
          }}
        >
          6
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('-');
          }}
        >
          -
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('1');
          }}
        >
          1
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('2');
          }}
        >
          2
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('3');
          }}
        >
          3
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('+');
          }}
        >
          +
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            backspace();
          }}
        >
          {'\u232B'}
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('0');
          }}
        >
          0
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            insertExpression('.');
          }}
        >
          .
        </CalculatorButton>
        <CalculatorButton
          onInteractionStart={onInteractionStart}
          onPress={() => {
            focusInput();
            props.onEquals();
          }}
        >
          =
        </CalculatorButton>
      </View>
    </View>
  );
}

function CalculatorButton({
  onPress,
  onInteractionStart,
  children,
  size = 20,
}: {
  onPress: () => void;
  onInteractionStart?: () => void;
  children: ReactNode;
  size?: number;
}) {
  return (
    <Button
      variant="normal"
      onPointerDown={e => {
        e.preventDefault();
        onInteractionStart?.();
        if ('vibrate' in navigator) {
          navigator.vibrate(3);
        }
      }}
      onPress={onPress}
      style={{
        background: theme.pillBackground,
        border: 0,
        color: theme.pillText,
        fontSize: size,
        fontWeight: 600,
        touchAction: 'manipulation',
      }}
    >
      {children}
    </Button>
  );
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  // Use the native setter so React-controlled inputs receive the change.
  // oxlint-disable-next-line typescript-eslint/unbound-method
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;

  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
