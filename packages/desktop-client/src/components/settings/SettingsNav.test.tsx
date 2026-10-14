import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';

import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { SettingsNav } from './SettingsNav';

vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));
vi.mock('#hooks/useIsTestEnv', () => ({
  useIsTestEnv: vi.fn(),
}));

function renderNav(initialPath: string, sidebarMenuItems?: unknown[]) {
  const store = createTestAppStore();
  if (sidebarMenuItems) {
    store.dispatch(
      mergeSyncedPrefs({
        'sidebar-menu-items': JSON.stringify(sidebarMenuItems),
      }),
    );
  }

  return render(
    <TestProviders store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SettingsNav />
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('SettingsNav', () => {
  beforeEach(() => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useIsTestEnv).mockReturnValue(false);
  });

  it('links every section under /settings', () => {
    renderNav('/settings');

    const hrefs = screen
      .getAllByRole('link')
      .map(link => link.getAttribute('href'));

    expect(hrefs).toEqual([
      '/settings/general',
      '/settings/payees',
      '/settings/tags',
      '/settings/rules',
      '/settings/bank-sync',
      '/settings/advanced',
      '/settings/experimental',
    ]);
  });

  it('leaves out pages that are shown in the sidebar', () => {
    renderNav('/settings', [
      { id: 'budget', hidden: false },
      { id: 'payees', hidden: false },
      { id: 'schedules', hidden: true },
    ]);

    const hrefs = screen
      .getAllByRole('link')
      .map(link => link.getAttribute('href'));

    expect(hrefs).toEqual([
      '/settings/general',
      '/settings/schedules',
      '/settings/tags',
      '/settings/rules',
      '/settings/bank-sync',
      '/settings/advanced',
      '/settings/experimental',
    ]);
  });

  it('hides bank sync without a server', () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('no-server');

    renderNav('/settings');

    expect(
      screen.queryByRole('link', { name: 'Bank Sync' }),
    ).not.toBeInTheDocument();
  });

  it('marks the current section as active', () => {
    renderNav('/settings/rules');

    expect(screen.getByRole('link', { name: 'Rules' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'General' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
