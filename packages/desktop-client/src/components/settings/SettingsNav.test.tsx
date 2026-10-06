import React from 'react';
import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useLocalPref } from '#hooks/useLocalPref';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { TestProviders } from '#mocks';

import { SettingsNav } from './SettingsNav';

vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));
vi.mock('#hooks/useIsTestEnv', () => ({
  useIsTestEnv: vi.fn(),
}));
vi.mock('#hooks/useLocalPref', () => ({
  useLocalPref: vi.fn(),
}));

function renderNav(initialPath: string) {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <SettingsNav />
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('SettingsNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useIsTestEnv).mockReturnValue(false);
    vi.mocked(useLocalPref).mockReturnValue([false, vi.fn(), vi.fn()]);
  });

  it('links every section under /settings', () => {
    renderNav('/settings');

    const hrefs = screen
      .getAllByRole('link')
      .map(link => link.getAttribute('href'));

    expect(hrefs).toEqual([
      '/settings',
      '/settings/payees',
      '/settings/rules',
      '/settings/bank-sync',
      '/settings/tags',
      '/settings/advanced',
    ]);
  });

  it('adds Experimental only once the setting is on', () => {
    renderNav('/settings');
    expect(
      screen.queryByRole('link', { name: 'Experimental' }),
    ).not.toBeInTheDocument();

    vi.mocked(useLocalPref).mockReturnValue([true, vi.fn(), vi.fn()]);
    renderNav('/settings');

    expect(
      screen.getAllByRole('link', { name: 'Experimental' })[0],
    ).toHaveAttribute('href', '/settings/experimental');
  });

  it('hides bank sync without a server', () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('no-server');

    renderNav('/settings');

    expect(
      screen.queryByRole('link', { name: 'Bank Sync' }),
    ).not.toBeInTheDocument();
  });

  it('marks only the current section as active', () => {
    renderNav('/settings/rules');

    expect(screen.getByRole('link', { name: 'Rules' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // General links to /settings, the parent of every other section, so it
    // must not stay active while a sub-page is open.
    expect(screen.getByRole('link', { name: 'General' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
