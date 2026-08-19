import type { ReactNode } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openCommandBar } from '#commandbar/commandBarSlice';
import { pushModal } from '#modals/modalsSlice';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';

import { CommandBar } from './CommandBar';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  saveFile: vi.fn(),
  syncAndDownload: vi.fn(),
  startTour: vi.fn(),
  navigate: vi.fn(),
  setGlobalPref: vi.fn(),
  setPrivacyPref: vi.fn(),
  switchTheme: vi.fn(),
}));

const mockData = vi.hoisted(() => ({
  accounts: [] as unknown[],
  customReports: [] as unknown[],
  dashboardPages: [] as unknown[],
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: mocks.send,
}));

vi.mock('#accounts', () => ({
  useSyncAndDownloadMutation: () => ({ mutate: mocks.syncAndDownload }),
}));

vi.mock('#accounts/useAccountSyncStatus', () => ({
  useAccountSyncStatus: () => () => undefined,
}));

vi.mock('#components/accounts/AccountStatusIndicator', () => ({
  AccountStatusIndicator: () => null,
}));

vi.mock('#components/tour/TourProvider', () => ({
  useTour: () => ({ startTour: mocks.startTour }),
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: mockData.accounts }),
}));

vi.mock('#hooks/useDashboardPages', () => ({
  useDashboardPages: () => ({ data: mockData.dashboardPages }),
}));

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: () => [undefined, mocks.setGlobalPref],
}));

vi.mock('#hooks/useMetadataPref', () => ({
  useMetadataPref: () => ['Demo budget', vi.fn()],
}));

vi.mock('#hooks/useNavigate', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('#hooks/useReports', () => ({
  useReports: () => ({ data: mockData.customReports }),
}));

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => [false, mocks.setPrivacyPref],
}));

vi.mock('#hooks/useThemeCatalog', () => ({
  useThemeCatalog: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('#spreadsheet/bindings', () => ({
  accountBalance: (id: string) => ({ id }),
  allAccountBalance: () => ({}),
  offBudgetAccountBalance: () => ({}),
  onBudgetAccountBalance: () => ({}),
}));

vi.mock('#style', () => ({
  themeOptions: [
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['midnight', 'Midnight'],
    ['auto', 'System default'],
  ],
  useTheme: () => ['light', mocks.switchTheme],
}));

vi.mock('#style/customThemes', () => ({
  embedThemeFonts: vi.fn(),
  extractRepoOwner: (repo: string) => repo.split('/')[0],
  fetchThemeCss: vi.fn(),
  generateThemeId: (repo: string) => repo,
  normalizeGitHubRepo: (repo: string) => repo,
  parseInstalledTheme: () => null,
  serializeInstalledTheme: (theme: unknown) => JSON.stringify(theme),
  validateThemeCss: (css: string) => css,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
        return options?.[name] ?? `{{${name}}}`;
      }),
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./primitives', () => ({
  BalanceRow: ({ label }: { label: string }) => label,
  FooterHint: ({ children }: { children: ReactNode }) => children,
  Highlight: ({ text }: { text: string }) => text,
  KeyChip: ({ children }: { children: ReactNode }) => children,
}));

function createStore() {
  return configureTestAppStore({ queryClient: createTestQueryClient() });
}

function renderCommandBar(store: ReturnType<typeof createStore>) {
  return render(
    <TestProviders store={store}>
      <CommandBar />
    </TestProviders>,
  );
}

function renderOpenCommandBar() {
  const store = createStore();
  store.dispatch(openCommandBar());
  renderCommandBar(store);
  return store;
}

describe('CommandBar', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
    mockData.accounts = [];
    mockData.customReports = [];
    mockData.dashboardPages = [];
    mocks.send.mockResolvedValue({ data: 'budget-export' });
    mocks.saveFile.mockResolvedValue(undefined);
    window.Actual.saveFile = mocks.saveFile;
  });

  afterEach(vi.unstubAllGlobals);

  it('does not open with the shortcut while a modal is open', () => {
    const store = createStore();
    store.dispatch(pushModal({ modal: { name: 'add-account', options: {} } }));
    renderCommandBar(store);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(store.getState().commandBar.open).toBe(false);
  });

  it('runs the sync-all-accounts action', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();

    await user.click(screen.getByText('Sync all accounts', { exact: true }));

    expect(mocks.syncAndDownload).toHaveBeenCalledWith({});
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('goes back to the root page when Escape is pressed on the theme page', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();

    await user.click(screen.getByText('Change theme…', { exact: true }));
    expect(screen.getByPlaceholderText('Search themes...')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(
      screen.getByPlaceholderText('Search Demo budget...'),
    ).toBeInTheDocument();
    expect(store.getState().commandBar.open).toBe(true);
  });

  it('starts the tour from the quick actions', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();

    await user.click(
      screen.getByText('Take a tour of Actual', { exact: true }),
    );

    expect(mocks.startTour).toHaveBeenCalledTimes(1);
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('uses stable, section-qualified values for items with the same id', () => {
    mockData.customReports = [{ id: 'budget', name: 'Budget report' }];
    const store = renderOpenCommandBar();

    expect(store.getState().commandBar.open).toBe(true);
    expect(
      screen.getByRole('option', { name: /^Budget$/ }),
    ).toHaveAttribute('data-value', 'navigation:budget');
    expect(
      screen.getByRole('option', { name: /^Budget report$/ }),
    ).toHaveAttribute('data-value', 'reports-custom:budget');
  });

  it('shows sticky warnings for both export size limits', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();
    mocks.send.mockResolvedValue({
      data: 'budget-export',
      warnings: ['exceeds-import-size-limit', 'may-exceed-available-memory'],
    });

    await user.click(screen.getByText('Export budget data', { exact: true }));

    await waitFor(() => expect(mocks.saveFile).toHaveBeenCalled());

    expect(store.getState().notifications.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'export-exceeds-import-size-limit',
          type: 'warning',
          sticky: true,
          message:
            'This export is larger than Actual can safely re-import. You may not be able to restore this backup.',
        }),
        expect.objectContaining({
          id: 'export-may-exceed-available-memory',
          type: 'warning',
          sticky: true,
          message:
            'This export is larger than the memory available on this device. Restoring it here may fail.',
        }),
      ]),
    );
  });

  it('closes after a normal quick action selection', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();

    await user.click(screen.getByText('Settings', { exact: true }));

    expect(store.getState().commandBar.open).toBe(false);
    expect(mocks.navigate).toHaveBeenCalledWith('/settings');
  });
});
