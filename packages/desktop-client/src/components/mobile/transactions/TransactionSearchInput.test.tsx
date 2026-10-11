import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import type { InitialEntry } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useNavigate } from '#hooks/useNavigate';

import { TransactionSearchInput } from './TransactionSearchInput';

function LocationSearch() {
  const location = useLocation();
  return (
    <>
      <div data-testid="location-search">{location.search}</div>
      <div data-testid="location-state">{JSON.stringify(location.state)}</div>
    </>
  );
}

function NavigateButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(to)}>Navigate to {to}</button>;
}

describe('TransactionSearchInput', () => {
  const renderSearchInput = (
    initialEntry: InitialEntry = '/accounts',
    onSearch = vi.fn(),
  ) => {
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <TransactionSearchInput placeholder="Search" onSearch={onSearch} />
        <LocationSearch />
        <NavigateButton to="/accounts" />
        <NavigateButton to="/accounts?search=bar" />
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

  it('keeps drill-down filters in the location state while searching', async () => {
    const user = userEvent.setup();
    const state = { filterConditions: [{ field: 'payee', op: 'is' }] };
    renderSearchInput({ pathname: '/accounts', state });

    await user.type(screen.getByPlaceholderText('Search'), 'foo');

    expect(screen.getByTestId('location-search')).toHaveTextContent(
      'search=foo',
    );
    expect(
      JSON.parse(screen.getByTestId('location-state').textContent ?? ''),
    ).toEqual(state);
  });

  it('does not overwrite typed text while the URL catches up', async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearchInput();

    await user.type(screen.getByPlaceholderText('Search'), 'foobar');

    expect(screen.getByPlaceholderText('Search')).toHaveValue('foobar');
    expect(onSearch).toHaveBeenLastCalledWith('foobar');
  });

  it('clears the search when navigating to the page without one', async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearchInput('/accounts?search=foo');
    onSearch.mockClear();

    await user.click(
      screen.getByRole('button', { name: 'Navigate to /accounts' }),
    );

    expect(screen.getByPlaceholderText('Search')).toHaveValue('');
    expect(onSearch).toHaveBeenLastCalledWith('');
  });

  it('applies a search changed by navigation while mounted', async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearchInput('/accounts?search=foo');
    onSearch.mockClear();

    await user.click(
      screen.getByRole('button', { name: 'Navigate to /accounts?search=bar' }),
    );

    expect(screen.getByPlaceholderText('Search')).toHaveValue('bar');
    expect(onSearch).toHaveBeenLastCalledWith('bar');
  });
});
