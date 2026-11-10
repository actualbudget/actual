import { setNumberFormat } from '@actual-app/core/shared/util';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FocusableAmountInput } from './FocusableAmountInput';

const mockPrefs = vi.hoisted(() => ({ currencyCode: 'JPY' }));

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    name === 'defaultCurrencyCode' ? mockPrefs.currencyCode : undefined,
    vi.fn(),
  ],
}));

describe('FocusableAmountInput', () => {
  beforeEach(() => {
    mockPrefs.currencyCode = 'JPY';
  });

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

  it('treats a pasted number as an amount in a currency with decimals', () => {
    mockPrefs.currencyCode = '';
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={0} focused />);

    const input = screen.getByTestId<HTMLInputElement>('amount-input');
    fireEvent.paste(input, { clipboardData: { getData: () => '12' } });
    expect(input.value).toBe('12.00');
  });

  it('keeps the caret in place when a digit is inserted mid-number', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={1234} focused />);

    const input = screen.getByTestId<HTMLInputElement>('amount-input');
    fireEvent.change(input, {
      target: { value: '1,2934', selectionStart: 4, selectionEnd: 4 },
    });
    expect(input.value).toBe('12,934');
    expect(input.selectionStart).toBe(4);
  });

  it('leaves a paste over part of the amount to the browser', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<FocusableAmountInput value={1234} focused />);

    const input = screen.getByTestId<HTMLInputElement>('amount-input');
    const clipboardData = { getData: () => '5' };

    input.setSelectionRange(1, 3);
    expect(fireEvent.paste(input, { clipboardData })).toBe(true);

    input.setSelectionRange(0, input.value.length);
    expect(fireEvent.paste(input, { clipboardData })).toBe(false);
  });
});
