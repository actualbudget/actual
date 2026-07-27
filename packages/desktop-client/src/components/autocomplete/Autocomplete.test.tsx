import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { Autocomplete } from './Autocomplete';

const suggestions = [
  { id: 'first', name: 'First category' },
  { id: 'second', name: 'Second category' },
];

describe('Autocomplete', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        query =>
          ({
            matches: false,
            media: query,
          }) as MediaQueryList,
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test.each([
    { canHover: true, isHighlighted: true },
    { canHover: false, isHighlighted: false },
  ])(
    'sets highlighted item from mouse movement when canHover is $canHover',
    async ({ canHover, isHighlighted }) => {
      vi.mocked(window.matchMedia).mockImplementation(
        query =>
          ({
            matches: query === '(hover: none)' ? !canHover : false,
            media: query,
          }) as MediaQueryList,
      );

      render(
        <Autocomplete
          embedded
          strict
          value={null}
          suggestions={suggestions}
          onSelect={vi.fn()}
        />,
      );

      const secondItem = screen.getByRole('button', {
        name: 'Second category',
      });
      fireEvent.mouseMove(secondItem);

      await waitFor(() => {
        expect(secondItem).toHaveAttribute(
          'aria-selected',
          String(isHighlighted),
        );
      });
    },
  );

  test('refilters suggestions when the input value changes', async () => {
    const user = userEvent.setup();
    const filterSuggestions = vi.fn(
      (items: typeof suggestions, value: string) =>
        items.filter(item => item.name.includes(value)),
    );

    render(
      <Autocomplete
        strict
        value={null}
        suggestions={suggestions}
        onSelect={vi.fn()}
        filterSuggestions={filterSuggestions}
      />,
    );

    filterSuggestions.mockClear();
    await user.type(screen.getByRole('textbox'), 'Second');

    expect(filterSuggestions).toHaveBeenCalledWith(suggestions, 'Second');
    expect(
      screen.getByRole('button', { name: 'Second category' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'First category' }),
    ).not.toBeInTheDocument();
  });

  test('does not refilter suggestions when an item is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const filterSuggestions = vi.fn((items: typeof suggestions) => items);

    render(
      <Autocomplete
        strict
        value={null}
        suggestions={suggestions}
        onSelect={onSelect}
        filterSuggestions={filterSuggestions}
      />,
    );

    filterSuggestions.mockClear();
    await user.click(screen.getByRole('textbox'));
    await user.click(screen.getByRole('button', { name: 'Second category' }));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('second', expect.any(String));
      expect(screen.queryByTestId('autocomplete')).not.toBeInTheDocument();
    });
    expect(filterSuggestions).not.toHaveBeenCalled();
  });
});
