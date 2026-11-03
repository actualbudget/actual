import { MemoryRouter, Route, Routes } from 'react-router';

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { SidebarSettings } from './SidebarSettings';

vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));
vi.mock('#hooks/useIsTestEnv', () => ({
  useIsTestEnv: vi.fn(),
}));

function renderSettings(sidebarMenuItems: unknown[]) {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      'sidebar-menu-items': JSON.stringify(sidebarMenuItems),
    }),
  );

  return render(
    <TestProviders store={store}>
      <MemoryRouter initialEntries={['/settings/general']}>
        <Routes>
          <Route path="/settings/general" element={<SidebarSettings />} />
          <Route path="/reports" element={<div>Reports page</div>} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('SidebarSettings', () => {
  beforeEach(() => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useIsTestEnv).mockReturnValue(false);
  });

  it('opens a hidden reports page from its row', async () => {
    renderSettings([{ id: 'reports', hidden: true }]);

    await userEvent.click(screen.getByRole('button', { name: 'Open Reports' }));

    expect(screen.getByText('Reports page')).toBeInTheDocument();
  });

  it('has no open button while reports is in the sidebar', () => {
    renderSettings([{ id: 'reports', hidden: false }]);

    expect(
      screen.queryByRole('button', { name: 'Open Reports' }),
    ).not.toBeInTheDocument();
  });
});
