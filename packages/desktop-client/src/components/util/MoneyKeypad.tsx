import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  Modal as ReactAriaModal,
  ModalOverlay as ReactAriaModalOverlay,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getNumberFormat, parseNumberFormat } from 'loot-core/shared/util';

import {
  MODAL_Z_INDEX,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type Result<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: string;
    };

type ErrorResult = { ok: false; error: string };

function isErrorResult<T>(result: Result<T>): result is ErrorResult {
  return result.ok === false;
}

type MoneyKeypadProps = {
  modalName: string;
  title: string;
  defaultValue: string;
  decimalSeparator?: string;
  onClose: () => void;
  onEvaluate: (value: string) => Result<string>;
  onDone: (value: string) => Result<void>;
  onChangeValue?: (value: string) => void;
};

type KeyDef = {
  label: string;
  insert?: string;
  ariaLabel?: string;
  action?: 'backspace' | 'clear' | 'evaluate' | 'done';
};

export function MoneyKeypad({
  modalName,
  title,
  defaultValue,
  decimalSeparator,
  onClose,
  onEvaluate,
  onDone,
  onChangeValue,
}: MoneyKeypadProps) {
  const { t } = useTranslation();
  const [numberFormatPref] = useSyncedPref('numberFormat');
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const displayRef = useRef<HTMLInputElement | null>(null);

  const numberFormatConfig = useMemo(
    () => parseNumberFormat({ format: numberFormatPref }),
    [numberFormatPref],
  );

  const decimalKey =
    decimalSeparator ??
    getNumberFormat({ format: numberFormatConfig.format }).decimalSeparator;

  useEffect(() => {
    // Keep in sync if parent changes the default.
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    // Focus the display for keyboard users.
    displayRef.current?.focus();
  }, []);

  const keys: KeyDef[][] = useMemo(
    () => [
      [
        { label: '7', insert: '7' },
        { label: '8', insert: '8' },
        { label: '9', insert: '9' },
        { label: '⌫', ariaLabel: t('Backspace'), action: 'backspace' },
      ],
      [
        { label: '4', insert: '4' },
        { label: '5', insert: '5' },
        { label: '6', insert: '6' },
        { label: t('Clear'), ariaLabel: t('Clear'), action: 'clear' },
      ],
      [
        { label: '1', insert: '1' },
        { label: '2', insert: '2' },
        { label: '3', insert: '3' },
        { label: '=', ariaLabel: t('Evaluate'), action: 'evaluate' },
      ],
      [
        { label: decimalKey, insert: decimalKey },
        { label: '0', insert: '0' },
        { label: '+', insert: '+' },
        { label: '-', insert: '-' },
      ],
      [
        { label: '×', ariaLabel: t('Multiply'), insert: '*' },
        { label: '÷', ariaLabel: t('Divide'), insert: '/' },
        { label: '(', insert: '(' },
        { label: ')', insert: ')' },
      ],
      [{ label: t('Done'), ariaLabel: t('Done'), action: 'done' }],
    ],
    [t, decimalKey],
  );

  function updateValue(nextValue: string) {
    setError(null);
    setValue(nextValue);
    onChangeValue?.(nextValue);
  }

  function backspace() {
    updateValue(value.slice(0, -1));
  }

  function clear() {
    updateValue('');
  }

  function insertText(text: string) {
    updateValue(value + text);
  }

  function evaluate() {
    const result = onEvaluate(value);
    if (isErrorResult(result)) {
      setError(result.error);
    } else {
      updateValue(result.value);
    }
  }

  function done() {
    const result = onDone(value);
    if (isErrorResult(result)) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  function handleKey(key: KeyDef) {
    if (key.action === 'backspace') {
      backspace();
      return;
    }
    if (key.action === 'clear') {
      clear();
      return;
    }
    if (key.action === 'evaluate') {
      evaluate();
      return;
    }
    if (key.action === 'done') {
      done();
      return;
    }
    if (key.insert) {
      insertText(key.insert);
    }
  }

  return (
    <ReactAriaModalOverlay
      data-testid={`${modalName}-modal`}
      isDismissable
      defaultOpen={true}
      onOpenChange={isOpen => !isOpen && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: MODAL_Z_INDEX,
        fontSize: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
      }}
    >
      <View
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          height: 'var(--visual-viewport-height)',
        }}
      >
        <ReactAriaModal>
          <Dialog
            aria-label={t('Calculator dialog')}
            style={{
              outline: 'none',
            }}
          >
            <View
              style={{
                ...styles.shadowLarge,
                backgroundColor: theme.modalBackground,
                color: theme.pageText,
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                width: '100vw',
                maxWidth: 500,
                maxHeight: 'calc(var(--visual-viewport-height) * 0.9)',
                overflowY: 'auto',
              }}
            >
              <ModalHeader
                title={<ModalTitle title={title} shrinkOnOverflow />}
                rightContent={<ModalCloseButton onPress={onClose} />}
              />

              <View style={{ padding: 10 }}>
                <Input
                  ref={displayRef}
                  value={value}
                  inputMode="none"
                  autoCapitalize="none"
                  aria-label={t('Calculator input')}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      done();
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      onClose();
                      return;
                    }
                    if (e.key === 'Backspace') {
                      e.preventDefault();
                      backspace();
                      return;
                    }
                    if (e.key === '=') {
                      e.preventDefault();
                      evaluate();
                      return;
                    }
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    fontSize: 18,
                  }}
                  onChangeValue={updateValue}
                />

                {error && (
                  <FormError style={{ marginTop: 8 }} aria-live="polite">
                    {error}
                  </FormError>
                )}

                <View style={{ marginTop: 12, gap: 8 }}>
                  {keys.map((row, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                      }}
                    >
                      {row.map(key => {
                        const isDone = key.action === 'done';

                        return (
                          <Button
                            key={key.action ?? key.insert ?? key.label}
                            aria-label={key.ariaLabel}
                            onPress={() => handleKey(key)}
                            variant={isDone ? 'primary' : 'normal'}
                            style={{
                              flex: 1,
                              height: 44,
                              justifyContent: 'center',
                            }}
                          >
                            {key.label}
                          </Button>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </Dialog>
        </ReactAriaModal>
      </View>
    </ReactAriaModalOverlay>
  );
}
