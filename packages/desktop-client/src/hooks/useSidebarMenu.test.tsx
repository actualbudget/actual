import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import { act, renderHook } from '@testing-library/react';

import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useNavigate } from '#hooks/useNavigate';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useSidebarMenu } from './useSidebarMenu';

vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));
vi.mock('#hooks/useIsTestEnv', () => ({
  useIsTestEnv: vi.fn(),
}));

function renderSidebarMenu(initialPath: string) {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      'sidebar-menu-items': JSON.stringify([{ id: 'reports', hidden: true }]),
    }),
  );

  const { result } = renderHook(
    () => ({ ...useSidebarMenu(), navigate: useNavigate() }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <TestProviders store={store}>
          <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
        </TestProviders>
      ),
    },
  );

  return result;
}

describe('useSidebarMenu', () => {
  beforeEach(() => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useIsTestEnv).mockReturnValue(false);
  });

  it('leaves a hidden reports page out of the sidebar', () => {
    const { sidebarItems } = renderSidebarMenu('/budget').current;

    expect(sidebarItems.map(item => item.id)).toEqual(['budget', 'schedules']);
  });

  it('shows a hidden reports page in the sidebar while it is open', () => {
    const { sidebarItems } = renderSidebarMenu('/reports/custom').current;

    expect(sidebarItems.map(item => item.id)).toEqual([
      'budget',
      'reports',
      'schedules',
    ]);
  });

  it('removes a hidden reports page after navigating away', () => {
    const result = renderSidebarMenu('/reports/custom');
    expect(result.current.sidebarItems.map(item => item.id)).toContain(
      'reports',
    );

    act(() => {
      void result.current.navigate('/budget');
    });

    expect(result.current.sidebarItems.map(item => item.id)).toEqual([
      'budget',
      'schedules',
    ]);
  });

  it('never moves a hidden reports page into settings', () => {
    const { settingsItems } = renderSidebarMenu('/budget').current;

    expect(settingsItems.map(item => item.id)).not.toContain('reports');
  });
});
