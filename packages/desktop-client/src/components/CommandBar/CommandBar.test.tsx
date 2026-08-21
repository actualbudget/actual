import type { ReactNode } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openCommandBar } from '#commandbar/commandBarSlice';
import {
  CommandBarProvider,
  useRegisterCommandBarCommands,
} from '#commandbar/index';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pushModal } from '#modals/modalsSlice';
import type * as ModalsSlice from '#modals/modalsSlice';

import { CommandBar } from './CommandBar';
import { destructiveActionClassName } from './styles';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  saveFile: vi.fn(),
  syncAndDownload: vi.fn(),
  reopenAccount: vi.fn(),
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
  accountQueries: {
    list: () => ({
      queryKey: ['accounts', 'lists'],
      queryFn: () => Promise.resolve(mockData.accounts),
    }),
  },
  useSyncAndDownloadMutation: () => ({ mutate: mocks.syncAndDownload }),
  useReopenAccountMutation: () => ({
    mutate: mocks.reopenAccount,
    mutateAsync: mocks.reopenAccount,
  }),
}));

vi.mock('#modals/modalsSlice', async importOriginal => {
  const actual = await importOriginal<typeof ModalsSlice>();
  return {
    ...actual,
    openAccountCloseModal: ({ accountId }: { accountId: string }) =>
      actual.pushModal({
        modal: {
          name: 'close-account',
          options: {
            account: {
              id: accountId,
              name: 'Checking',
              offbudget: 0,
              closed: 0,
              sort_order: 0,
              last_reconciled: null,
              tombstone: 0,
              account_id: null,
              bank: null,
              bankName: null,
              bankId: null,
              mask: null,
              official_name: null,
              balance_current: null,
              balance_available: null,
              balance_limit: null,
              account_sync_source: null,
              last_sync: null,
              bank_sync_status: null,
            },
            balance: 0,
            canDelete: false,
          },
        },
      }),
  };
});

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
  ShortcutHint: ({ label }: { label: ReactNode }) => label,
}));

function createStore() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(['accounts', 'lists'], mockData.accounts);
  return configureTestAppStore({ queryClient });
}

function renderCommandBar(
  store: ReturnType<typeof createStore>,
  children?: ReactNode,
) {
  return render(
    <TestProviders store={store}>
      <CommandBarProvider>
        {children}
        <CommandBar />
      </CommandBarProvider>
    </TestProviders>,
  );
}

function renderOpenCommandBar(children?: ReactNode) {
  const store = createStore();
  store.dispatch(openCommandBar());
  renderCommandBar(store, children);
  return store;
}

async function keyboardSelectRootItem(name: string) {
  const input = screen.getByPlaceholderText('Search Demo budget...');
  input.focus();

  for (let i = 0; i < 50; i++) {
    const item = screen.getByRole('option', { name });
    if (item.getAttribute('data-selected') === 'true') return;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
  }

  throw new Error(`Could not keyboard-select ${name}`);
}

function ContributedCommands({
  ownerId = 'test-owner',
  commands,
}: {
  ownerId?: string;
  commands: Parameters<typeof useRegisterCommandBarCommands>[1];
}) {
  useRegisterCommandBarCommands(ownerId, commands);
  return null;
}

describe('CommandBar', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {
          return undefined;
        }
        unobserve() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
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

  it('opens an account action page from the keyboard-selected root item', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search actions...')).toHaveFocus();
    expect(screen.getAllByRole('listbox')).toHaveLength(1);
    expect(
      screen.getByRole('listbox', { name: 'Available actions' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('back');
  });

  it('executes an action with keyboard navigation and Enter', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    const actionInput = screen.getByPlaceholderText('Search actions...');
    expect(actionInput).toHaveFocus();
    await userEvent.setup().keyboard('{ArrowDown}{ArrowUp}{Enter}');

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/accounts/account-1');
    });
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('does not open an action page for an unsupported root item', () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(
      screen.queryByPlaceholderText('Search actions...'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search Demo budget...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('close');
  });

  it('opens a custom-report action page from the root palette', async () => {
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Monthly report');
    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();
    expect(screen.getByText('Monthly report')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
  });

  it('restores root search and selection from an action page', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();
    const rootInput = screen.getByPlaceholderText('Search Demo budget...');

    await userEvent.setup().type(rootInput, 'Checking');
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText('Search actions...'), {
      key: 'Backspace',
    });
    expect(screen.getByPlaceholderText('Search Demo budget...')).toHaveValue(
      'Checking',
    );

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByPlaceholderText('Search Demo budget...')).toHaveValue(
      'Checking',
    );
    expect(screen.getByRole('option', { name: 'Checking' })).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  it('shows close for active accounts and reopen for closed accounts', async () => {
    mockData.accounts = [
      { id: 'active-account', name: 'Checking', closed: 0 },
      { id: 'closed-account', name: 'Old checking', closed: 1 },
    ];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(
      screen.getByRole('option', { name: 'Close account' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Reopen account' }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await keyboardSelectRootItem('Old checking');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(
      screen.getByRole('option', { name: 'Reopen account' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Close account' }),
    ).not.toBeInTheDocument();
  });

  it('keeps action section headings and destructive styling when filtering', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await userEvent
      .setup()
      .type(screen.getByPlaceholderText('Search actions...'), 'close');

    expect(screen.getByText('Additional', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Close account' })).toHaveClass(
      destructiveActionClassName,
    );
    expect(
      screen.queryByText('Primary', { exact: true }),
    ).not.toBeInTheDocument();
  });

  it('closes before executing contextual navigation', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    mocks.navigate.mockImplementation(() => {
      expect(store.getState().commandBar.open).toBe(false);
    });
    await userEvent.setup().click(screen.getByRole('option', { name: 'Open' }));

    expect(mocks.navigate).toHaveBeenCalledWith('/accounts/account-1');
  });

  it('opens the close confirmation without mutating an active account', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    mocks.send.mockImplementation(async (command: string) => {
      if (command === 'account-properties') {
        return { balance: 0, numTransactions: 1 };
      }
      if (command === 'accounts-get') return mockData.accounts;
      return { data: 'budget-export' };
    });

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Close account' }));
    expect(store.getState().commandBar.open).toBe(false);
    await waitFor(() => {
      expect(store.getState().modals.modalStack).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'close-account' }),
        ]),
      );
    });
    expect(
      mocks.send.mock.calls.some(([command]) => command === 'account-close'),
    ).toBe(false);
  });

  it('fails clearly when rendered without a command bar provider', () => {
    const store = createStore();

    expect(() =>
      render(
        <TestProviders store={store}>
          <CommandBar />
        </TestProviders>,
      ),
    ).toThrow('useCommandBarCommands must be used within a CommandBarProvider');
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
    expect(screen.getByRole('option', { name: /^Budget$/ })).toHaveAttribute(
      'data-value',
      'navigation:budget',
    );
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

  it('shows, filters, executes, and closes for a contributed quick action', async () => {
    const user = userEvent.setup();
    const execute = vi.fn();
    const store = renderOpenCommandBar(
      <ContributedCommands
        commands={[{ id: 'open', label: 'Open contributed item', execute }]}
      />,
    );

    expect(screen.getByText('Open contributed item')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Search Demo budget...');
    await user.type(input, 'contributed');
    expect(screen.getByText('Open contributed item')).toBeInTheDocument();

    await user.click(screen.getByText('Open contributed item'));

    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('updates and removes contributed commands while the palette is open', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const first = {
      id: 'first',
      label: 'First contributed item',
      execute: vi.fn(),
    };
    const second = {
      id: 'second',
      label: 'Second contributed item',
      execute: vi.fn(),
    };
    const view = render(
      <TestProviders store={store}>
        <CommandBarProvider>
          <ContributedCommands commands={[first]} />
          <CommandBar />
        </CommandBarProvider>
      </TestProviders>,
    );

    expect(screen.getByText('First contributed item')).toBeInTheDocument();

    view.rerender(
      <TestProviders store={store}>
        <CommandBarProvider>
          <ContributedCommands commands={[second]} />
          <CommandBar />
        </CommandBarProvider>
      </TestProviders>,
    );

    await waitFor(() => {
      expect(
        screen.queryByText('First contributed item'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Second contributed item')).toBeInTheDocument();
    });

    view.rerender(
      <TestProviders store={store}>
        <CommandBarProvider>
          <ContributedCommands commands={[]} />
          <CommandBar />
        </CommandBarProvider>
      </TestProviders>,
    );

    await waitFor(() =>
      expect(
        screen.queryByText('Second contributed item'),
      ).not.toBeInTheDocument(),
    );
    expect(store.getState().commandBar.open).toBe(true);
  });

  it('reports contributed action failures and still closes normally', async () => {
    const user = userEvent.setup();
    const error = new Error('contributed failure');
    const execute = vi.fn(() => {
      throw error;
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const store = renderOpenCommandBar(
      <ContributedCommands
        commands={[{ id: 'failing', label: 'Failing action', execute }]}
      />,
    );

    await user.click(screen.getByText('Failing action'));
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Command bar action failed', {
        commandId: 'test-owner:failing',
        error,
      }),
    );
    expect(store.getState().commandBar.open).toBe(false);
    consoleError.mockRestore();
  });

  it('reports rejected promises from contributed actions', async () => {
    const user = userEvent.setup();
    const error = new Error('async contributed failure');
    const execute = vi.fn().mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    renderOpenCommandBar(
      <ContributedCommands
        commands={[{ id: 'async-failing', label: 'Async failure', execute }]}
      />,
    );

    await user.click(screen.getByText('Async failure'));
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Command bar action failed', {
        commandId: 'test-owner:async-failing',
        error,
      }),
    );
    consoleError.mockRestore();
  });
});
