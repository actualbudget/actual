import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DateSelect } from './DateSelect';

// vi.mock is hoisted above the imports by vitest, so these apply even
// though they are written after them (required by the import-order rule).
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => [undefined, vi.fn()],
}));

vi.mock('#hooks/useLocale', () => ({
  useLanguage: () => 'en-US',
}));

describe('DateSelect', () => {
  it('returns focus to the input after picking a day from the calendar', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <DateSelect
        value="2026-11-01"
        dateFormat="yyyy-MM-dd"
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    const dayButton = await screen.findByText('10');
    await user.click(dayButton);

    expect(onSelect).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });
});
