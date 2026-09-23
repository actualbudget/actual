import { fireEvent, render, screen } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CoverMenu } from './CoverMenu';

vi.mock('#hooks/useCategories', () => ({
  useCategories: () => ({
    data: {
      grouped: [
        {
          id: 'group',
          name: 'Group',
          is_income: false,
          categories: [{ id: 'source', name: 'Source' }],
        },
      ],
    },
  }),
}));
vi.mock('#components/autocomplete/CategoryAutocomplete', () => ({
  CategoryAutocomplete: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button type="button" onClick={() => onSelect('source')}>
      Source
    </button>
  ),
}));

it.each([
  [0, '1,234'],
  [3, '1.234'],
] as const)('covers a budget amount at %sdp', (precision, display) => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'KWD',
        precision,
      }),
    }),
  );
  const onSubmit = vi.fn();
  render(
    <TestProviders store={store}>
      <CoverMenu initialAmount={1234} onSubmit={onSubmit} onClose={vi.fn()} />
    </TestProviders>,
  );
  expect(screen.getByRole('textbox')).toHaveValue(display);
  fireEvent.click(screen.getByRole('button', { name: 'Source' }));
  fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));
  expect(onSubmit).toHaveBeenCalledWith(1234, 'source');
});
