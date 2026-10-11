import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TransactionSearchInput } from './TransactionSearchInput';

function LocationSearch() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('TransactionSearchInput', () => {
  const renderSearchInput = (
    initialEntry = '/accounts',
    onSearch = vi.fn(),
  ) => {
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <TransactionSearchInput placeholder="Search" onSearch={onSearch} />
        <LocationSearch />
      </MemoryRouter>,
    );
    return { onSearch };
  };

  it('starts empty and does not search when there is no search param', () => {
    const { onSearch } = renderSearchInput();

    expect(screen.getByPlaceholderText('Search')).toHaveValue('');
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('does not search when the search param is empty', () => {
    const { onSearch } = renderSearchInput('/accounts?search=');

    expect(screen.getByPlaceholderText('Search')).toHaveValue('');
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('keeps the search in the URL so it survives leaving the page', async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearchInput();

    await user.type(screen.getByPlaceholderText('Search'), 'foo');

    expect(onSearch).toHaveBeenLastCalledWith('foo');
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      'search=foo',
    );
  });

  it('restores the search from the URL and applies it', () => {
    const { onSearch } = renderSearchInput('/accounts?search=%23tag');

    expect(screen.getByPlaceholderText('Search')).toHaveValue('#tag');
    expect(onSearch).toHaveBeenCalledWith('#tag');
  });

  it('removes the search param when the search is cleared', async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearchInput('/accounts?search=foo');

    await user.clear(screen.getByPlaceholderText('Search'));

    expect(onSearch).toHaveBeenLastCalledWith('');
    expect(screen.getByTestId('location-search')).toHaveTextContent('');
  });

  it('leaves other URL params intact', async () => {
    const user = userEvent.setup();
    renderSearchInput('/accounts/1?reconcile=100');

    await user.type(screen.getByPlaceholderText('Search'), 'foo');

    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(new URLSearchParams(search).get('reconcile')).toBe('100');
    expect(new URLSearchParams(search).get('search')).toBe('foo');
  });
});
