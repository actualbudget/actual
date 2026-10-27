import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AmountInput } from './AmountInput';

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    { defaultCurrencyCode: 'JPY', hideFraction: 'true' }[name],
    vi.fn(),
  ],
}));

describe('AmountInput', () => {
  it('keeps a hidden fraction when the text is left unedited', () => {
    const onUpdate = vi.fn();
    render(<AmountInput value={150050} onUpdate={onUpdate} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.blur(input);
    fireEvent.focus(input);
    fireEvent.keyUp(input, { key: 'Enter' });

    expect(onUpdate.mock.calls).toEqual([[150050], [150050]]);
  });
});
