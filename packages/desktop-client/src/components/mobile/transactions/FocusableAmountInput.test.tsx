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

  it('holds the current amount in the input so it can be selected and copied', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={1234} focused />);

    expect(screen.getByTestId<HTMLInputElement>('amount-input').value).toBe(
      '1,234',
    );
  });

  it('replaces the amount when text is pasted over it', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={1234} focused />);

    const input = screen.getByTestId<HTMLInputElement>('amount-input');
    fireEvent.change(input, { target: { value: '9999' } });
    expect(input.value).toBe('9,999');
  });
});
