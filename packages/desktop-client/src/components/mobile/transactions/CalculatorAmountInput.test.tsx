import { setNumberFormat } from '@actual-app/core/shared/util';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CalculatorAmountInput } from './CalculatorAmountInput';

const mockPrefs = vi.hoisted(() => ({
  hideFraction: 'false',
  currencyCode: '',
}));

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    name === 'hideFraction'
      ? mockPrefs.hideFraction
      : name === 'defaultCurrencyCode'
        ? mockPrefs.currencyCode
        : undefined,
    vi.fn(),
  ],
}));

function setup(value = 0) {
  render(<CalculatorAmountInput value={value} autoFocus />);
  const input = screen.getByTestId<HTMLInputElement>('amount-input');
  const press = (keys: string) => {
    for (const key of keys) {
      const name = key === '<' ? '⌫' : key === '*' ? '×' : key;
      fireEvent.click(screen.getByRole('button', { name }));
    }
  };
  return { input, press };
}

describe('CalculatorAmountInput', () => {
  beforeEach(() => {
    mockPrefs.hideFraction = 'false';
    mockPrefs.currencyCode = '';
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
  });
  afterEach(cleanup);

  it('fills typed digits in from the cents', () => {
    const { input, press } = setup();
    press('1');
    expect(input).toHaveValue('0.01');
    press('23456');
    expect(input).toHaveValue('1,234.56');
    expect(input.selectionStart).toBe(8);
  });

  it('formats each number of a sum and ignores the decimal key', () => {
    const { input, press } = setup();
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

  it('backspaces digit by digit until the number is gone', () => {
    const { input, press } = setup();
    press('123456<');
    expect(input).toHaveValue('123.45');
    press('<<<<');
    expect(input).toHaveValue('0.01');
    press('<');
    expect(input).toHaveValue('');
  });

  it('edits in the middle of a number', () => {
    const { input, press } = setup();
    press('1234');
    input.setSelectionRange(2, 2);
    press('5');
    expect(input).toHaveValue('125.34');
    expect(input.selectionStart).toBe(3);
    press('<<');
    expect(input).toHaveValue('1.34');
    expect(input.selectionStart).toBe(1);
    press('9');
    expect(input).toHaveValue('19.34');
    expect(input.selectionStart).toBe(2);
  });

  it('takes digits as typed when fractions are hidden', () => {
    mockPrefs.hideFraction = 'true';
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    const { input, press } = setup();
    press('123');
    expect(input).toHaveValue('123');
  });

  it('takes digits as whole units in a currency without decimals', () => {
    mockPrefs.currencyCode = 'JPY';
    const { input, press } = setup();
    press('123');
    expect(input).toHaveValue('123');
  });
});
