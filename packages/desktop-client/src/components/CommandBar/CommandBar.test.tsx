import type { ReactNode } from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeCommandBar, openCommandBar } from '#commandbar/commandBarSlice';
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
import {
  actionItemClassName,
  destructiveActionClassName,
  paletteItemClassName,
} from './styles';

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
  budgetId: 'budget-1',
  pathname: '/budget',
  accounts: [] as unknown[],
  customReports: [] as unknown[],
  dashboardPages: [] as unknown[],
}));

vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: mockData.pathname }),
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
              account_group_id: null,
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
  useMetadataPref: (prefName: string) => [
    prefName === 'id' ? mockData.budgetId : 'Demo budget',
    vi.fn(),
  ],
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

function rerenderCommandBar(
  view: { rerender: (ui: ReactNode) => void },
  store: ReturnType<typeof createStore>,
  children?: ReactNode,
) {
  view.rerender(
    <TestProviders store={store}>
      <CommandBarProvider>
        {children}
        <CommandBar />
      </CommandBarProvider>
    </TestProviders>,
  );
}

function setCommandBarPath(
  view: { rerender: (ui: ReactNode) => void },
  store: ReturnType<typeof createStore>,
  pathname: string,
) {
  mockData.pathname = pathname;
  rerenderCommandBar(view, store);
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

function openSelectedContextualActions() {
  fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
    key: 'Enter',
    ctrlKey: true,
  });
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
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'Linux x86_64',
    });
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
    window.localStorage.clear();
    mockData.budgetId = 'budget-1';
    mockData.pathname = '/budget';
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

  it('opens while closed with Ctrl+K', () => {
    const store = createStore();
    renderCommandBar(store);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(store.getState().commandBar.open).toBe(true);
  });

  it('passes Ctrl+K to cmdk Vim navigation while open', async () => {
    mockData.accounts = [
      { id: 'account-1', name: 'Checking', closed: 0 },
      { id: 'account-2', name: 'Savings', closed: 0 },
    ];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Savings');
    const input = screen.getByPlaceholderText('Search Demo budget...');
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('option', { name: 'Checking' })).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  it('opens an account action page from the keyboard-selected root item', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    expect(screen.getByRole('dialog')).toHaveTextContent('Open actions');
    openSelectedContextualActions();

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
    expect(screen.getByLabelText('Keyboard shortcuts')).toBeInTheDocument();
  });

  it('executes an action with keyboard navigation and Enter', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();

    const actionInput = screen.getByPlaceholderText('Search actions...');
    expect(actionInput).toHaveFocus();
    await userEvent.setup().keyboard('{ArrowDown}{ArrowUp}{Enter}');

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/accounts/account-1');
    });
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('executes the primary action once for plain Enter', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();

    fireEvent.keyDown(screen.getByPlaceholderText('Search actions...'), {
      key: 'Enter',
    });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/accounts/account-1');
    });
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('does not execute a secondary action for Cmd+Enter on macOS', async () => {
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });
    mockData.accounts = [{ id: 'account-1', name: 'Old checking', closed: 1 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Old checking');
    openSelectedContextualActions();

    const actionInput = screen.getByPlaceholderText('Search actions...');
    expect(screen.getByLabelText('Keyboard shortcuts')).toHaveTextContent(
      'Reopen account',
    );
    fireEvent.keyDown(actionInput, { key: 'Enter', metaKey: true });

    expect(mocks.reopenAccount).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(store.getState().commandBar.open).toBe(true);
  });

  it('executes only the explicit secondary action for literal Ctrl+Enter on macOS', async () => {
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });
    mockData.accounts = [{ id: 'account-1', name: 'Old checking', closed: 1 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Old checking');
    openSelectedContextualActions();

    fireEvent.keyDown(screen.getByPlaceholderText('Search actions...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(mocks.reopenAccount).toHaveBeenCalledWith({ id: 'account-1' });
    });
    expect(mocks.reopenAccount).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('executes only the explicit secondary action for Ctrl+Enter elsewhere', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Old checking', closed: 1 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Old checking');
    openSelectedContextualActions();

    fireEvent.keyDown(screen.getByPlaceholderText('Search actions...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(mocks.reopenAccount).toHaveBeenCalledWith({ id: 'account-1' });
    });
    expect(mocks.reopenAccount).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('does nothing for a modified Enter when the selected action has no secondary', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();

    fireEvent.keyDown(screen.getByPlaceholderText('Search actions...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(store.getState().commandBar.open).toBe(true);
  });

  it('never promotes the destructive action to a secondary shortcut', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();

    const actionInput = screen.getByPlaceholderText('Search actions...');
    fireEvent.keyDown(actionInput, { key: 'ArrowDown' });
    expect(
      screen.getByRole('option', { name: 'Close account' }),
    ).toHaveAttribute('data-selected', 'true');
    fireEvent.keyDown(actionInput, { key: 'Enter', ctrlKey: true });

    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(store.getState().commandBar.open).toBe(true);
    expect(store.getState().modals.modalStack).toEqual([]);
    expect(
      mocks.send.mock.calls.some(([command]) => command === 'account-close'),
    ).toBe(false);
  });

  it('opens an action page for a navigation root item', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    const rootInput = screen.getByPlaceholderText('Search Demo budget...');
    await userEvent.setup().type(rootInput, 'Settings');
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Settings' }),
      ).toBeInTheDocument(),
    );
    openSelectedContextualActions();

    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('back');
  });

  it('does not open contextual actions for Cmd+Enter at the root', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      metaKey: true,
    });

    expect(
      screen.queryByPlaceholderText('Search actions...'),
    ).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(store.getState().commandBar.open).toBe(true);
  });

  it('persists an eligible favorite reference without executing the action', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();

    expect(
      screen
        .getByRole('option', { name: 'Add to favorites' })
        .querySelector('svg'),
    ).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Add to favorites' }));

    expect(store.getState().commandBar.open).toBe(true);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        window.localStorage.getItem('budget-1-commandbar.favorites') ?? '',
      ),
    ).toEqual({
      version: 2,
      favorites: [{ type: 'account', id: 'account-1' }],
    });
  });

  it('renders a distinct icon for the remove-favorite action', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();

    const addFavorite = screen.getByRole('option', {
      name: 'Add to favorites',
    });
    const addIcon = addFavorite.querySelector('svg');
    expect(addIcon).toBeInTheDocument();

    await userEvent.setup().click(addFavorite);

    const removeFavorite = screen.getByRole('option', {
      name: 'Remove from favorites',
    });
    const removeIcon = removeFavorite.querySelector('svg');
    expect(removeIcon).toBeInTheDocument();
    expect(removeIcon?.outerHTML).not.toBe(addIcon?.outerHTML);
    expect(store.getState().commandBar.open).toBe(true);
  });

  it('toggles the favorite once through cmdk keyboard selection', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();

    expect(screen.getByPlaceholderText('Search actions...')).toHaveFocus();
    await userEvent.setup().keyboard('{ArrowUp}{Enter}');

    expect(
      screen.getByRole('option', { name: 'Remove from favorites' }),
    ).toBeInTheDocument();
    expect(store.getState().commandBar.open).toBe(true);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        window.localStorage.getItem('budget-1-commandbar.favorites') ?? '',
      ),
    ).toEqual({
      version: 2,
      favorites: [{ type: 'account', id: 'account-1' }],
    });
  });

  it('restores a stored favorite and resolves its live label', async () => {
    mockData.accounts = [
      { id: 'account-1', name: 'Renamed checking', closed: 0 },
    ];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'account-1' }],
      }),
    );
    renderOpenCommandBar();

    expect(screen.getByText('Favorites', { exact: true })).toBeInTheDocument();
    expect(
      screen.getAllByRole('option', { name: 'Renamed checking' }),
    ).toHaveLength(1);

    await keyboardSelectRootItem('Renamed checking');
    openSelectedContextualActions();
    expect(
      screen.getByRole('option', { name: 'Remove from favorites' }),
    ).toBeInTheDocument();
  });

  it('isolates favorites by budget', () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'account-1' }],
      }),
    );
    mockData.budgetId = 'budget-2';
    renderOpenCommandBar();

    expect(
      screen.queryByText('Favorites', { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Checking' }),
    ).toBeInTheDocument();
  });

  it('preserves stored favorite order and removes canonical duplicates', () => {
    mockData.accounts = [
      { id: 'account-1', name: 'Checking', closed: 0 },
      { id: 'account-2', name: 'Savings', closed: 0 },
    ];
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [
          { type: 'report', id: 'report-1' },
          { type: 'account', id: 'account-2' },
          { type: 'account', id: 'account-1' },
        ],
      }),
    );
    renderOpenCommandBar();

    const options = screen.getAllByRole('option');
    expect(
      options.slice(0, 3).map(option => option.getAttribute('aria-label')),
    ).toEqual(['Monthly report', 'Savings', 'Checking']);
    expect(screen.getAllByRole('option', { name: 'Checking' })).toHaveLength(1);
    expect(
      screen.getAllByRole('option', { name: 'Monthly report' }),
    ).toHaveLength(1);
  });

  it('hides malformed and stale favorite references without rewriting them', () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const stored = {
      version: 2,
      favorites: [
        { type: 'account' },
        { type: 'account', id: 'deleted-account' },
        { type: 'report', id: 'deleted-report' },
      ],
    };
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify(stored),
    );
    renderOpenCommandBar();

    expect(
      screen.queryByText('Favorites', { exact: true }),
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem('budget-1-commandbar.favorites')).toBe(
      JSON.stringify(stored),
    );
  });

  it('persists only eligible domain references when writing favorites', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();
    await userEvent
      .setup()
      .click(screen.getByText('Settings', { exact: true }));

    expect(window.localStorage.getItem('budget-1-commandbar.favorites')).toBe(
      null,
    );
  });

  it('persists custom report favorites as report references', async () => {
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    renderOpenCommandBar();
    await keyboardSelectRootItem('Monthly report');
    openSelectedContextualActions();

    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Add to favorites' }));

    expect(
      JSON.parse(
        window.localStorage.getItem('budget-1-commandbar.favorites') ?? '',
      ),
    ).toEqual({
      version: 2,
      favorites: [{ type: 'report', id: 'report-1' }],
    });
  });

  it('retains stale references during a later favorite write', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'deleted-account' }],
      }),
    );
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();
    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Add to favorites' }));

    expect(store.getState().commandBar.open).toBe(true);
    expect(
      JSON.parse(
        window.localStorage.getItem('budget-1-commandbar.favorites') ?? '',
      ),
    ).toEqual({
      version: 2,
      favorites: [
        { type: 'account', id: 'deleted-account' },
        { type: 'account', id: 'account-1' },
      ],
    });
  });

  it('tracks four route-backed pages and displays the three prior pages', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    await act(async () => {
      setCommandBarPath(view, store, '/settings');
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    setCommandBarPath(view, store, '/schedules');
    setCommandBarPath(view, store, '/tags');

    await waitFor(() => {
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
      expect(
        screen
          .getAllByRole('option')
          .slice(0, 3)
          .map(option => option.getAttribute('aria-label')),
      ).toEqual(['Schedules', 'Settings', 'Budget']);
    });
  });

  it('moves a revisited page to the front of recent history', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/settings');
    setCommandBarPath(view, store, '/schedules');
    setCommandBarPath(view, store, '/settings');
    setCommandBarPath(view, store, '/tags');

    await waitFor(() => {
      expect(
        screen
          .getAllByRole('option')
          .slice(0, 3)
          .map(option => option.getAttribute('aria-label')),
      ).toEqual(['Settings', 'Schedules', 'Budget']);
    });
  });

  it('ignores current, unsupported, and reports redirect paths', async () => {
    mockData.pathname = '/reports';
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    await waitFor(() => {
      expect(
        screen.queryByText('Recent', { exact: true }),
      ).not.toBeInTheDocument();
    });

    setCommandBarPath(view, store, '/settings');
    setCommandBarPath(view, store, '/reports');
    setCommandBarPath(view, store, '/reports/custom');

    await waitFor(() => {
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
      expect(screen.getAllByRole('option', { name: 'Settings' })).toHaveLength(
        1,
      );
      expect(screen.getAllByRole('option', { name: 'Reports' })).toHaveLength(
        1,
      );
    });
  });

  it('resolves renamed recent entities and hides deleted ones', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/accounts/account-1');
    setCommandBarPath(view, store, '/settings');

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Checking' }),
      ).toBeInTheDocument();
    });

    mockData.accounts = [
      { id: 'account-1', name: 'Renamed checking', closed: 1 },
    ];
    rerenderCommandBar(view, store);
    expect(
      screen.getByRole('option', { name: 'Renamed checking' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Checking' }),
    ).not.toBeInTheDocument();

    mockData.accounts = [];
    rerenderCommandBar(view, store);
    expect(
      screen.queryByRole('option', { name: 'Renamed checking' }),
    ).not.toBeInTheDocument();
  });

  it('excludes favorited pages from Recent and canonical duplicates', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'account-1' }],
      }),
    );
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/accounts/account-1');
    setCommandBarPath(view, store, '/settings');

    await waitFor(() => {
      expect(
        screen.getByText('Favorites', { exact: true }),
      ).toBeInTheDocument();
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
      expect(screen.getAllByRole('option', { name: 'Checking' })).toHaveLength(
        1,
      );
      expect(
        screen
          .getAllByRole('option')
          .slice(0, 1)
          .map(option => option.getAttribute('aria-label')),
      ).toEqual(['Budget']);
    });
  });

  it('preserves recent pages when the palette closes and reopens', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/settings');
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Budget' }),
      ).toBeInTheDocument();
    });

    act(() => {
      void store.dispatch(closeCommandBar());
    });
    act(() => {
      void store.dispatch(openCommandBar());
    });

    await waitFor(() => {
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Budget' }),
      ).toBeInTheDocument();
    });
  });

  it('resets recent pages when the provider and budget remount', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/settings');
    await waitFor(() => {
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
    });

    view.unmount();
    mockData.budgetId = 'budget-2';
    const nextStore = createStore();
    nextStore.dispatch(openCommandBar());
    renderCommandBar(nextStore);

    await waitFor(() => {
      expect(
        screen.queryByText('Recent', { exact: true }),
      ).not.toBeInTheDocument();
    });
  });

  it('tracks dashboards and custom reports from their live catalogs', async () => {
    mockData.dashboardPages = [{ id: 'dashboard-1', name: 'Overview' }];
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/reports/dashboard-1');
    setCommandBarPath(view, store, '/reports/custom/report-1');
    setCommandBarPath(view, store, '/budget');

    await waitFor(() => {
      expect(
        screen
          .getAllByRole('option')
          .slice(0, 2)
          .map(option => option.getAttribute('aria-label')),
      ).toEqual(['Monthly report', 'Overview']);
    });
  });

  it('opens a custom-report action page from the root palette', async () => {
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Monthly report');
    openSelectedContextualActions();

    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();
    expect(screen.getByText('Monthly report')).toBeInTheDocument();
    expect(
      screen.getByText('Custom Reports', { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
  });

  it('labels dashboard report action pages as Reports', async () => {
    mockData.dashboardPages = [{ id: 'main', name: 'Main' }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Main');
    openSelectedContextualActions();

    expect(screen.getAllByText('Main')).not.toHaveLength(0);
    expect(screen.getByText('Reports', { exact: true })).toBeInTheDocument();
  });

  it('restores root search and selection from an action page', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();
    const rootInput = screen.getByPlaceholderText('Search Demo budget...');

    await userEvent.setup().type(rootInput, 'Checking');
    await keyboardSelectRootItem('Checking');
    openSelectedContextualActions();
    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText('Search actions...'), {
      key: 'Backspace',
    });
    expect(screen.getByPlaceholderText('Search Demo budget...')).toHaveValue(
      'Checking',
    );

    openSelectedContextualActions();
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
    openSelectedContextualActions();
    expect(
      screen.getByRole('option', { name: 'Close account' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Reopen account' }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await keyboardSelectRootItem('Old checking');
    openSelectedContextualActions();
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
    openSelectedContextualActions();
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
    openSelectedContextualActions();

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
    openSelectedContextualActions();
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

  it('shows, filters, executes, and closes for a contributed page action', async () => {
    const user = userEvent.setup();
    const execute = vi.fn();
    const store = renderOpenCommandBar(
      <ContributedCommands
        commands={[{ id: 'open', label: 'Open contributed item', execute }]}
      />,
    );

    expect(
      screen.getByText('Page actions', { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('Open contributed item')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Open contributed item' }),
    ).toHaveAttribute('data-value', 'page-actions:test-owner:open');

    const input = screen.getByPlaceholderText('Search Demo budget...');
    await user.type(input, 'contributed');
    expect(screen.getByText('Open contributed item')).toBeInTheDocument();

    await user.click(screen.getByText('Open contributed item'));

    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('closes before executing a contributed page action', async () => {
    const execute = vi.fn();
    const store = renderOpenCommandBar(
      <ContributedCommands
        commands={[{ id: 'close-first', label: 'Close first', execute }]}
      />,
    );
    execute.mockImplementation(() => {
      expect(store.getState().commandBar.open).toBe(false);
    });

    await userEvent
      .setup()
      .click(screen.getByText('Close first', { exact: true }));

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('uses the restrained destructive row treatment for destructive page actions', () => {
    renderOpenCommandBar(
      <ContributedCommands
        commands={[
          {
            id: 'close',
            label: 'Close account',
            destructive: true,
            execute: vi.fn(),
          },
        ]}
      />,
    );

    const item = screen.getByRole('option', { name: 'Close account' });
    expect(item).toHaveClass(actionItemClassName, destructiveActionClassName);
    expect(item).not.toHaveClass(paletteItemClassName);
  });

  it('places page actions after Recent and before Favorites', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'account-1' }],
      }),
    );
    const commands = [
      { id: 'open', label: 'Open contributed item', execute: vi.fn() },
    ];
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(
      store,
      <ContributedCommands commands={commands} />,
    );

    mockData.pathname = '/settings';
    rerenderCommandBar(
      view,
      store,
      <ContributedCommands commands={commands} />,
    );
    mockData.pathname = '/budget';
    rerenderCommandBar(
      view,
      store,
      <ContributedCommands commands={commands} />,
    );

    await waitFor(() => {
      const recent = screen.getByText('Recent', { exact: true });
      const pageActions = screen.getByText('Page actions', { exact: true });
      const favorites = screen.getByText('Favorites', { exact: true });

      expect(
        recent.compareDocumentPosition(pageActions) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        pageActions.compareDocumentPosition(favorites) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it('does not render a page action group without registrations', () => {
    renderOpenCommandBar();

    expect(
      screen.queryByText('Page actions', { exact: true }),
    ).not.toBeInTheDocument();
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
      id: 'first',
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

  it('opens the same action page from a recent root row with Ctrl+Enter', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);
    setCommandBarPath(view, store, '/settings');
    setCommandBarPath(view, store, '/budget');

    await waitFor(() => expect(screen.getByText('Recent')).toBeInTheDocument());
    const rootInput = screen.getByPlaceholderText('Search Demo budget...');
    await userEvent.setup().type(rootInput, 'Settings');
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Settings' }),
      ).toBeInTheDocument(),
    );
    openSelectedContextualActions();

    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Settings' }),
    ).toBeInTheDocument();
  });

  it('restores root search and selection after detailed Change Theme', async () => {
    renderOpenCommandBar();
    const rootInput = screen.getByPlaceholderText('Search Demo budget...');
    await userEvent.setup().type(rootInput, 'Change theme');
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Change theme…' }),
      ).toBeInTheDocument(),
    );
    await keyboardSelectRootItem('Change theme…');
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Change theme…' }),
      ).toHaveAttribute('data-selected', 'true'),
    );
    openSelectedContextualActions();

    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Change theme…' }));
    expect(screen.getByPlaceholderText('Search themes...')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByPlaceholderText('Search Demo budget...')).toHaveValue(
      'Change theme',
    );
    expect(
      screen.getByRole('option', { name: 'Change theme…' }),
    ).toHaveAttribute('data-selected', 'true');
  });

  it('keeps distinct duplicate page-action instances executable', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const store = renderOpenCommandBar(
      <>
        <ContributedCommands
          commands={[
            { id: 'same', instanceId: 'first', label: 'First', execute: first },
          ]}
        />
        <ContributedCommands
          commands={[
            {
              id: 'same',
              instanceId: 'second',
              label: 'Second',
              execute: second,
            },
          ]}
        />
      </>,
    );

    await userEvent.setup().click(screen.getByText('First', { exact: true }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('shows a favorited page action again when searching the root', async () => {
    renderOpenCommandBar(
      <ContributedCommands
        commands={[
          { id: 'searchable', label: 'Searchable action', execute: vi.fn() },
        ]}
      />,
    );
    await keyboardSelectRootItem('Searchable action');
    openSelectedContextualActions();
    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Add to favorites' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    const rootInput = screen.getByPlaceholderText('Search Demo budget...');
    await userEvent.setup().type(rootInput, 'Searchable');
    expect(
      screen.getByRole('option', { name: 'Searchable action' }),
    ).toBeInTheDocument();
  });

  it('returns safely to root when a page action unregisters while open', async () => {
    const execute = vi.fn();
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(
      store,
      <ContributedCommands
        commands={[{ id: 'temporary', label: 'Temporary action', execute }]}
      />,
    );
    await keyboardSelectRootItem('Temporary action');
    openSelectedContextualActions();

    rerenderCommandBar(view, store);
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText('Search Demo budget...'),
      ).toBeInTheDocument(),
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
