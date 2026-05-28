import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { TagAutocomplete } from './TagAutocomplete';

vi.mock('#hooks/useTags', () => ({
  useTags: () => ({
    data: [
      { id: 'vacation-id', tag: 'vacation', color: null },
      { id: 'taxes-id', tag: 'taxes', color: null },
    ],
  }),
  useFilteredTags: (filterStr: string) => ({
    data: filterStr.startsWith('#')
      ? [
          { id: 'vacation-id', tag: 'vacation', color: null },
          { id: 'taxes-id', tag: 'taxes', color: null },
        ].filter(tag => tag.tag.includes(filterStr.slice(1)))
      : [],
    refetch: vi.fn(),
  }),
}));

describe('TagAutocomplete', () => {
  test('renders matching tag options inline when embedded', async () => {
    const user = userEvent.setup();
    const setInputValue = vi.fn();

    render(
      <TestProviders>
        <TagAutocomplete
          inputValue="#vac"
          setInputValue={setInputValue}
          embedded
        />
      </TestProviders>,
    );

    await user.click(screen.getByRole('combobox', { name: 'Notes' }));

    expect(
      screen.getByTestId('tag-autocomplete-embedded-options'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: '#vacation' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: '#vacation' }));

    expect(setInputValue).toHaveBeenCalledWith('#vacation ');
  });
});
