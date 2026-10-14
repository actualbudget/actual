import React, { memo, useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { CalculatorButtons } from '#components/common/CalculatorButtons';

export const CalculatorKeyboard = memo(function CalculatorAmountInput({
  inputRef,
  header,
  isOpen,
  initialTransitionDelay,
  onToggleSign,
  onEquals,
  onClear,
  onReset,
  onDismiss,
  onApply,
  onInteractionStart,
}: {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly header?: ReactNode;
  readonly isOpen: boolean;
  readonly initialTransitionDelay?: number;
  readonly onEquals: () => void;
  readonly onClear: () => void;
  readonly onToggleSign: () => void;
  readonly onReset: () => void;
  readonly onDismiss: () => void;
  readonly onApply: () => void;
  readonly onInteractionStart: () => void;
}) {
  const initialTransitionRef = useRef(false);
  const [isOpenDebounced, setIsOpenDebounced] = useState(false);

  useEffect(() => {
    if (isOpen === isOpenDebounced) return;

    if (!initialTransitionRef.current && initialTransitionDelay) {
      initialTransitionRef.current = true;
      const handle = setTimeout(
        () => setIsOpenDebounced(isOpen),
        initialTransitionDelay,
      );
      return () => clearTimeout(handle);
    }
    setIsOpenDebounced(isOpen);
  }, [isOpen, isOpenDebounced, initialTransitionDelay]);

  return (
    <View
      style={{
        background: theme.modalBackground,
        borderColor: theme.tooltipBorder,
        borderTopWidth: 1,
        bottom: 0,
        display: 'flex',
        gap: 6,
        height: '50dvh',
        maxHeight: 400,
        minHeight: 320,
        left: 0,
        overflow: 'visible',
        position: 'fixed',
        padding: 8,
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        right: 0,
        transform: isOpenDebounced ? 'translateY(0)' : 'translateY(100%)',
        transitionProperty: 'transform',
        transitionDuration: '100ms',
        zIndex: 10,
        ...styles.shadowLarge,
      }}
    >
      {header}
      <CalculatorButtons
        style={{ flex: 1 }}
        inputRef={inputRef}
        onEquals={onEquals}
        onClear={onClear}
        onInteractionStart={onInteractionStart}
      />
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexShrink: 0,
          gap: 6,
        }}
      >
        <NonFocusableButton
          variant="normal"
          onPress={onToggleSign}
          onInteractionStart={onInteractionStart}
        >
          + / -
        </NonFocusableButton>
        <NonFocusableButton
          variant="normal"
          onPress={onReset}
          onInteractionStart={onInteractionStart}
        >
          <Trans>Reset</Trans>
        </NonFocusableButton>
        <NonFocusableButton
          variant="normal"
          onPress={onDismiss}
          data-testid="amount-dismiss"
        >
          <Trans>Dismiss</Trans>
        </NonFocusableButton>
        <NonFocusableButton
          variant="primary"
          onPress={onApply}
          data-testid="amount-apply"
        >
          <Trans>Apply</Trans>
        </NonFocusableButton>
      </View>
    </View>
  );
});

const maybeVibrate = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(3);
  }
};

function NonFocusableButton({
  variant,
  onPress,
  onInteractionStart,
  children,
}: {
  variant: 'primary' | 'normal';
  onPress: () => void;
  onInteractionStart?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={variant}
      style={{
        flex: 1,
        height: styles.mobileMinHeight,
      }}
      onPointerDown={e => {
        e.preventDefault();
        onInteractionStart?.();
        maybeVibrate();
      }}
      onPress={onPress}
    >
      {children}
    </Button>
  );
}
