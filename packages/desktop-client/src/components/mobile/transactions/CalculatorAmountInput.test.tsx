import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CalculatorAmountInput } from './CalculatorAmountInput';

function setup(prefs: Parameters<typeof mergeSyncedPrefs>[0] = {}) {
  const store = createTestAppStore();
  store.dispatch(mergeSyncedPrefs(prefs));
  render(
    <TestProviders store={store}>
      <CalculatorAmountInput value={0} autoFocus />
    </TestProviders>,
  );
  const input = screen.getByTestId<HTMLInputElement>('amount-input');
  const press = (keys: string) => {
    for (const key of keys) {
      const name = key === '<' ? '⌫' : key === '*' ? '×' : key;
      fireEvent.click(screen.getByText(name));
    }
  };
  return { input, press };
}

describe('CalculatorAmountInput', () => {
  it('fills typed digits in from the cents', () => {
    const { input, press } = setup();
    press('0');
    expect(input).toHaveValue('0.00');
    press('1');
    expect(input).toHaveValue('0.01');
    press('23456');
    expect(input).toHaveValue('1,234.56');
    expect(input.selectionStart).toBe(8);
  });

  it('keeps a number with an apostrophe separator together', () => {
    const { input, press } = setup({ numberFormat: 'apostrophe-dot' });
    press('1234567');
    expect(input).toHaveValue('12\u2019345.67');
  });

  it('formats each number of a sum and ignores the decimal key', () => {
    const { input, press } = setup();
    press('.');
    expect(input).toHaveValue('');
    press('150+2.5');
    expect(input).toHaveValue('1.50+0.25');
    press('=');
    expect(input).toHaveValue('1.75');
  });

  it('leaves a number after a multiplication as typed', () => {
    const { input, press } = setup();
    press('150*2');
    expect(input).toHaveValue('1.50*2');
    press('=');
    expect(input).toHaveValue('3.00');
  });

  it('leaves a negative factor as typed but keeps subtraction in cents', () => {
    const { input, press } = setup();
    press('150*-2');
    expect(input).toHaveValue('1.50*-2');
    press('-5');
    expect(input).toHaveValue('1.50*-2-0.05');
  });

  it('backspaces digit by digit until the number is gone', () => {
    const { input, press } = setup();
    press('123456<');
    expect(input).toHaveValue('123.45');
    press('<<<<');
    expect(input).toHaveValue('0.01');
    press('<');
    expect(input).toHaveValue('');
  });

  it('keeps the caret in place when editing in the middle of a number', () => {
    const { input, press } = setup();
    press('123456');
    input.setSelectionRange(3, 3);
    press('9');
    expect(input).toHaveValue('12,934.56');
    expect(input.selectionStart).toBe(4);
    press('..');
    expect(input).toHaveValue('12,934.56');
    expect(input.selectionStart).toBe(4);
  });

  it('removes the digit just typed before a separator', () => {
    const { input, press } = setup();
    press('1234');
    input.setSelectionRange(3, 3);
    press('5');
    expect(input).toHaveValue('125.34');
    press('<');
    expect(input).toHaveValue('12.34');
  });

  it('backspaces past a thousands separator', () => {
    const { input, press } = setup();
    press('123456');
    input.setSelectionRange(2, 2);
    press('<');
    expect(input).toHaveValue('1,234.56');
    expect(input.selectionStart).toBe(1);
    press('<');
    expect(input).toHaveValue('234.56');
    expect(input.selectionStart).toBe(0);
  });

  it('takes digits as typed when fractions are hidden', () => {
    const { input, press } = setup({ hideFraction: 'true' });
    press('123');
    expect(input).toHaveValue('123');
  });

  it('takes digits as whole units in a currency without decimals', () => {
    const { input, press } = setup({ defaultCurrencyCode: 'JPY' });
    press('123');
    expect(input).toHaveValue('123');
  });
});
