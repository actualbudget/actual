import { setNumberFormat } from '@actual-app/core/shared/util';
import { fireEvent, render, screen } from '@testing-library/react';

import { SplitAmountInput } from './SplitAmountInput';

let mockPrefs: Record<string, string> = {};

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

function setPrefs(defaultCurrencyCode: string, hideFraction = false) {
  mockPrefs = {
    'flags.currency': 'true',
    'flags.multiCurrency': 'true',
    defaultCurrencyCode,
    hideFraction: String(hideFraction),
  };
  setNumberFormat({ format: 'comma-dot', hideFraction });
}

function renderInput(currencyCode?: string, value = 0) {
  const onChange = vi.fn();
  render(
    <SplitAmountInput
      value={value}
      currencyCode={currencyCode}
      onChange={onChange}
    />,
  );
  return { input: screen.getByRole<HTMLInputElement>('textbox'), onChange };
}

// One change event per key, each adding the key to what the input holds.
// Returns the text shown after each key.
function typeKeys(input: HTMLInputElement, keys: string) {
  const shown: string[] = [];
  for (const key of keys) {
    fireEvent.change(input, { target: { value: input.value + key } });
    shown.push(input.value);
  }
  return shown;
}

const CENTS = ['0.01', '0.15', '1.52', '15.25'];
const WHOLE_UNITS = ['1', '15', '152', '1,525'];

afterEach(() => {
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
});

describe('SplitAmountInput', () => {
  it.each([
    ['CAD', undefined, CENTS, 15.25],
    ['CAD', 'USD', CENTS, 15.25],
    ['CAD', 'JPY', WHOLE_UNITS, 1525],
    ['JPY', undefined, WHOLE_UNITS, 1525],
    ['JPY', 'JPY', WHOLE_UNITS, 1525],
    ['JPY', 'USD', CENTS, 15.25],
  ])(
    'in a %s budget, fills the smallest unit of an account in %s',
    (defaultCurrencyCode, currencyCode, expectedText, expectedAmount) => {
      setPrefs(defaultCurrencyCode);
      const { input, onChange } = renderInput(currencyCode);

      expect(typeKeys(input, '1525')).toEqual(expectedText);
      fireEvent.blur(input);

      expect(onChange).toHaveBeenCalledWith(expectedAmount);
    },
  );

  it('shows an amount in another currency with its decimal places', () => {
    setPrefs('JPY');
    const { input } = renderInput('USD', 15.25);

    expect(input.value).toBe('15.25');
  });

  describe('with decimals hidden', () => {
    it.each([undefined, 'CAD'])(
      'reads typed digits as whole amounts for an account in %s',
      currencyCode => {
        setPrefs('CAD', true);
        const { input, onChange } = renderInput(currencyCode);

        typeKeys(input, '1525');
        fireEvent.blur(input);

        expect(onChange).toHaveBeenCalledWith(1525);
      },
    );

    it('keeps the decimal places of another currency', () => {
      setPrefs('CAD', true);
      const { input, onChange } = renderInput('USD');

      expect(typeKeys(input, '1525')).toEqual(CENTS);
      fireEvent.blur(input);

      expect(onChange).toHaveBeenCalledWith(15.25);
    });
  });

  describe('with the calculator', () => {
    it.each([
      [undefined, '15'],
      ['USD', '15.25'],
    ])(
      'shows an amount of an account in %s in a budget in yen as %s',
      (currencyCode, expected) => {
        setPrefs('JPY', true);
        mockPrefs['flags.mobileCalculator'] = 'true';
        render(<SplitAmountInput value={15.25} currencyCode={currencyCode} />);

        expect(screen.getByTestId<HTMLInputElement>('amount-input').value).toBe(
          expected,
        );
      },
    );
  });
});
