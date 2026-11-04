import { setNumberFormat } from '@actual-app/core/shared/util';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FocusableAmountInput } from './FocusableAmountInput';

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    name === 'defaultCurrencyCode' ? 'JPY' : undefined,
    vi.fn(),
  ],
}));

describe('FocusableAmountInput', () => {
  it('takes typed digits as whole units in a currency without decimals', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={0} focused />);

    const input = screen.getByTestId<HTMLInputElement>('amount-input');
    for (const digit of '1500') {
      fireEvent.change(input, { target: { value: input.value + digit } });
    }
    expect(input.value).toBe('1,500');
  });

  it('shows the same amount in the input and the visible text', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={1234} focused />);

    const input = screen.getByTestId<HTMLInputElement>('amount-input');
    const text = screen.getByTestId('amount-input-text');
    expect(input.value).toBe('1,234');
    expect(text.textContent).toBe(input.value);
  });

  it('keeps the input and the visible text in sync when text is pasted', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={1234} focused />);

    const input = screen.getByTestId<HTMLInputElement>('amount-input');
    const text = screen.getByTestId('amount-input-text');
    fireEvent.change(input, { target: { value: '9999' } });
    expect(input.value).toBe('9,999');
    expect(text.textContent).toBe(input.value);
  });

  it('leaves the input empty but shows zero in the visible text for a zero amount', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={0} focused />);

    // Empty so typed digits aren't appended to a "0".
    expect(screen.getByTestId<HTMLInputElement>('amount-input').value).toBe('');
    expect(screen.getByTestId('amount-input-text').textContent).toBe('0');
  });
});
