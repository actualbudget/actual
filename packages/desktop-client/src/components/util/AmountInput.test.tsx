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
  it('keeps a hidden fraction until the text is edited', () => {
    const onUpdate = vi.fn();
    render(<AmountInput value={150050} onUpdate={onUpdate} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.keyUp(input, { key: 'Enter' });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole('button', { name: 'Make negative' }));
    // Clearing and retyping the rounded text is an edit
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: '1,501' } });
    fireEvent.blur(input);

    expect(onUpdate.mock.calls).toEqual([
      [150050],
      [150050],
      [-150050],
      [-150100],
    ]);
  });
});
