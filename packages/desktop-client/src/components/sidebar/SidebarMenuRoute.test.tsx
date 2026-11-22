import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { render, screen } from '@testing-library/react';

import { RequireSyncServer } from '#components/banksync/RequireSyncServer';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { TestProviders } from '#mocks';

import { SidebarMenuRoute } from './SidebarMenuRoute';

vi.mock('#hooks/useIsTestEnv', () => ({
  useIsTestEnv: vi.fn(),
}));
vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));

function Location() {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
}

function renderRoutes(initialEntry: string) {
  render(
    <TestProviders>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/settings/bank-sync"
            element={
              <SidebarMenuRoute id="bank-sync" isInSettings>
                <div>Bank sync page</div>
              </SidebarMenuRoute>
            }
          />
          <Route
            path="/bank-sync"
            element={
              <SidebarMenuRoute id="bank-sync">
                <div>Bank sync page</div>
              </SidebarMenuRoute>
            }
          />
          <Route
            path="/bank-sync/account/:accountId/edit"
            element={
              <RequireSyncServer>
                <div>Account edit page</div>
              </RequireSyncServer>
            }
          />
          <Route path="/settings" element={<div>Settings index</div>} />
        </Routes>
        <Location />
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('bank sync routes', () => {
  beforeEach(() => {
    vi.mocked(useIsTestEnv).mockReturnValue(false);
  });

  it.each(['/settings/bank-sync', '/bank-sync', '/bank-sync/account/abc/edit'])(
    'redirects %s to settings without a server',
    path => {
      vi.mocked(useSyncServerStatus).mockReturnValue('no-server');

      renderRoutes(path);

      expect(screen.getByTestId('location')).toHaveTextContent(/^\/settings$/);
      expect(screen.getByText('Settings index')).toBeInTheDocument();
    },
  );

  it.each(['online', 'offline'] as const)(
    'keeps the page when the server is %s',
    status => {
      vi.mocked(useSyncServerStatus).mockReturnValue(status);

      renderRoutes('/settings/bank-sync');

      expect(screen.getByText('Bank sync page')).toBeInTheDocument();
    },
  );

  it('keeps the account edit page with a server', () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');

    renderRoutes('/bank-sync/account/abc/edit');

    expect(screen.getByText('Account edit page')).toBeInTheDocument();
  });

  it('keeps the page without a server under the test runner', () => {
    vi.mocked(useIsTestEnv).mockReturnValue(true);
    vi.mocked(useSyncServerStatus).mockReturnValue('no-server');

    renderRoutes('/settings/bank-sync');

    expect(screen.getByText('Bank sync page')).toBeInTheDocument();
  });
});
