import { setNumberFormat } from '@actual-app/core/shared/util';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FocusableAmountInput } from './FocusableAmountInput';

let mockPrefs: Record<string, string> = {};

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

// Multiple currencies on, with CAD as the default currency
const MULTI_CURRENCY_PREFS = {
  'flags.currency': 'true',
  'flags.multiCurrency': 'true',
  defaultCurrencyCode: 'CAD',
};

function setHideFraction(hideFraction: boolean) {
  mockPrefs.hideFraction = String(hideFraction);
  setNumberFormat({ format: 'comma-dot', hideFraction });
}

function renderInput(currencyCode?: string) {
  const onUpdateAmount = vi.fn();
  render(
    <FocusableAmountInput
      value={0}
      focused
      currencyCode={currencyCode}
      onUpdateAmount={onUpdateAmount}
    />,
  );
  return {
    input: screen.getByTestId<HTMLInputElement>('amount-input'),
    onUpdateAmount,
  };
}

// One change event per key, each adding the key to what the input holds,
// like typing on a phone keyboard. Returns the text shown after each key.
function typeKeys(input: HTMLInputElement, keys: string) {
  const shown: string[] = [];
  for (const key of keys) {
    fireEvent.change(input, { target: { value: input.value + key } });
    shown.push(screen.getByTestId('amount-input-text').textContent ?? '');
  }
  return shown;
}

beforeEach(() => {
  mockPrefs = { ...MULTI_CURRENCY_PREFS };
  setHideFraction(false);
});

afterEach(() => {
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
});

describe('FocusableAmountInput', () => {
  it.each([
    [undefined, 15],
    ['CAD', 15],
    ['USD', 15],
    ['JPY', 1500],
  ])(
    'reads typed digits with the decimal places of %s',
    (currencyCode, expected) => {
      const { input, onUpdateAmount } = renderInput(currencyCode);

      fireEvent.change(input, { target: { value: '1500' } });
      fireEvent.blur(input);

      expect(onUpdateAmount).toHaveBeenCalledWith(expected);
    },
  );

  it.each([
    ['without a currency', undefined, ['0.01', '0.15', '1.50', '15.00'], 15],
    ['in the default currency', 'CAD', ['0.01', '0.15', '1.50', '15.00'], 15],
    ['in another currency', 'USD', ['0.01', '0.15', '1.50', '15.00'], 15],
    [
      'in a currency without decimals',
      'JPY',
      ['1', '15', '150', '1,500'],
      1500,
    ],
  ])(
    'fills the decimal places key by key for an account %s',
    (_account, currencyCode, expectedText, expectedAmount) => {
      const { input, onUpdateAmount } = renderInput(currencyCode);

      expect(typeKeys(input, '1500')).toEqual(expectedText);
      fireEvent.blur(input);

      expect(onUpdateAmount).toHaveBeenCalledWith(expectedAmount);
    },
  );

  describe('with decimals hidden', () => {
    beforeEach(() => {
      setHideFraction(true);
    });

    it.each([
      ['without a currency', undefined],
      ['in the default currency', 'CAD'],
    ])(
      'reads typed digits as whole amounts for an account %s',
      (_account, currencyCode) => {
        const { input, onUpdateAmount } = renderInput(currencyCode);

        expect(typeKeys(input, '1500')).toEqual(['1', '15', '150', '1,500']);
        fireEvent.blur(input);

        expect(onUpdateAmount).toHaveBeenCalledWith(1500);
      },
    );

    it('keeps the decimal places of another currency', () => {
      const { input, onUpdateAmount } = renderInput('USD');

      expect(typeKeys(input, '1500')).toEqual([
        '0.01',
        '0.15',
        '1.50',
        '15.00',
      ]);
      fireEvent.blur(input);

      expect(onUpdateAmount).toHaveBeenCalledWith(15);
    });

    it('types every account like the default currency while multiple currencies are off', () => {
      mockPrefs['flags.multiCurrency'] = 'false';
      const { input, onUpdateAmount } = renderInput('USD');

      expect(typeKeys(input, '1500')).toEqual(['1', '15', '150', '1,500']);
      fireEvent.blur(input);

      expect(onUpdateAmount).toHaveBeenCalledWith(1500);
    });
  });

  describe('with a default currency without decimals', () => {
    beforeEach(() => {
      mockPrefs = { defaultCurrencyCode: 'JPY', hideFraction: 'false' };
    });

    it('takes typed digits as whole units', () => {
      const { input, onUpdateAmount } = renderInput();

      expect(typeKeys(input, '1500')).toEqual(['1', '15', '150', '1,500']);
      fireEvent.blur(input);

      expect(onUpdateAmount).toHaveBeenCalledWith(1500);
    });

    it('ignores a decimal separator, whether typed or pasted', () => {
      const { input } = renderInput();

      expect(typeKeys(input, '1.5').at(-1)).toBe('15');
      fireEvent.change(input, { target: { value: '1.5' } });
      expect(screen.getByTestId('amount-input-text').textContent).toBe('15');
    });
  });
});
