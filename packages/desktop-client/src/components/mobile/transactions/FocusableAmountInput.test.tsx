import { setNumberFormat } from '@actual-app/core/shared/util';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FocusableAmountInput } from './FocusableAmountInput';

const mocks = vi.hoisted(() => ({
  prefs: {} as Record<string, string | undefined>,
}));

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mocks.prefs[name], vi.fn()],
}));

function typeDigits(digits: string[]) {
  const input = screen.getByTestId('amount-input');
  let typed = '';
  for (const digit of digits) {
    typed = (input as HTMLInputElement).value + digit;
    fireEvent.change(input, { target: { value: typed } });
  }
  return (input as HTMLInputElement).value;
}

describe('FocusableAmountInput', () => {
  beforeEach(() => {
    // Decimal places shown
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
  });

  it('fills cents from typed digits in a currency with decimals', () => {
    mocks.prefs = { defaultCurrencyCode: 'USD', hideFraction: 'false' };
    render(<FocusableAmountInput value={0} focused />);

    expect(typeDigits(['1', '5'])).toBe('0.15');
  });

  it('takes typed digits as whole units in a currency without decimals', () => {
    mocks.prefs = { defaultCurrencyCode: 'JPY', hideFraction: 'false' };
    render(<FocusableAmountInput value={0} focused />);

    expect(typeDigits(['1', '5', '0', '0'])).toBe('1,500');
  });

  it('ignores a decimal separator in a currency without decimals', () => {
    mocks.prefs = { defaultCurrencyCode: 'JPY', hideFraction: 'false' };
    render(<FocusableAmountInput value={0} focused />);

    // Typed one key at a time or pasted at once, the digits are the same
    expect(typeDigits(['1', '.', '5'])).toBe('15');
    fireEvent.change(screen.getByTestId('amount-input'), {
      target: { value: '1.5' },
    });
    expect((screen.getByTestId('amount-input') as HTMLInputElement).value).toBe(
      '15',
    );
  });
});
