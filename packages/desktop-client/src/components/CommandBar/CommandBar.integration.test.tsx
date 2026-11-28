import { send } from '@actual-app/core/platform/client/connection';
import type { Theme } from '@actual-app/core/types/prefs';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  closeCommandBar,
  openCommandBar,
  setCommandBarOpen,
} from '#commandbar/commandBarSlice';
import { embedThemeFonts, fetchThemeCss } from '#style/customThemes';
import type { CatalogTheme } from '#style/customThemes';

import { CommandBar } from './CommandBar';

const dispatch = vi.fn();
const mutate = vi.fn();
const startTour = vi.fn();
const switchTheme = vi.fn();
const setLightTheme = vi.fn();
const setDarkTheme = vi.fn();
let modalStack: unknown[] = [];
let open = true;
let currentTheme: Theme = 'light';

const catalogTheme: CatalogTheme = {
  name: 'Community theme',
  repo: 'example/community-theme',
  mode: 'light',
  colors: [],
};

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

vi.mock('#redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ commandBar: { open } }),
}));
vi.mock('#accounts/mutations', () => ({
  useSyncAndDownloadMutation: () => ({ mutate }),
}));
vi.mock('#accounts/useAccountSyncStatus', () => ({
  useAccountSyncStatus: () => () => 'success',
}));
vi.mock('#hooks/useModalState', () => ({
  useModalState: () => ({ modalStack }),
}));
vi.mock('#hooks/useSidebarMenu', () => ({
  useSidebarMenu: () => ({ availableItems: [] }),
}));
vi.mock('#components/sidebar/useSidebarMenuItemDetails', () => ({
  useSidebarMenuItemDetails: () => ({}),
}));
vi.mock('#hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('#hooks/useReports', () => ({ useReports: () => ({ data: [] }) }));
vi.mock('#hooks/useDashboardPages', () => ({
  useDashboardPages: () => ({ data: [] }),
}));
vi.mock('#hooks/useNavigate', () => ({ useNavigate: () => vi.fn() }));
vi.mock('#hooks/useMetadataPref', () => ({
  useMetadataPref: () => ['Budget'],
}));
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => ['false', vi.fn()],
}));
vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: (key: string) => [
    null,
    key === 'installedCustomLightTheme' ? setLightTheme : setDarkTheme,
  ],
}));
vi.mock('#style', () => ({ useTheme: () => [currentTheme, switchTheme] }));
vi.mock(import('#style/customThemes'), async importOriginal => ({
  ...(await importOriginal()),
  fetchThemeCss: vi.fn(),
  embedThemeFonts: vi.fn(),
}));
vi.mock('#components/tour/TourProvider', () => ({
  useTour: () => ({ startTour }),
}));
vi.mock('#components/spreadsheet/CellValue', () => ({
  CellValue: ({
    children,
  }: {
    children: (props: { value: number }) => unknown;
  }) => children({ value: 0 }),
  CellValueText: () => null,
}));
vi.mock('#spreadsheet/bindings', () => ({
  accountBalance: () => ({}),
  allAccountBalance: () => ({}),
  offBudgetAccountBalance: () => ({}),
  onBudgetAccountBalance: () => ({}),
}));
vi.mock('./ThemePage', () => ({
  ThemePage: ({
    onSelectBuiltin,
    onSelectCatalog,
  }: {
    onSelectBuiltin: (theme: Theme) => void;
    onSelectCatalog: (theme: CatalogTheme) => void;
  }) => (
    <div data-testid="theme-page">
      <button onClick={() => onSelectBuiltin('midnight')}>Midnight</button>
      <button onClick={() => onSelectCatalog(catalogTheme)}>
        Install community theme
      </button>
      <button
        onClick={() =>
          onSelectCatalog({
            ...catalogTheme,
            name: 'Newer theme',
            repo: 'example/newer-theme',
          })
        }
      >
        Install newer theme
      </button>
    </div>
  ),
  isThemePageEscape: (key: string, page: string) =>
    key === 'Escape' && page === 'themes',
}));

describe('CommandBar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modalStack = [];
    open = true;
    currentTheme = 'light';
    vi.mocked(send).mockReset();
    vi.mocked(fetchThemeCss).mockReset();
    vi.mocked(embedThemeFonts).mockImplementation(async css => css);
    window.Actual.saveFile = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('stays closed when Ctrl/Cmd+K is pressed over an active modal', () => {
    open = false;
    modalStack = [{}];
    render(<CommandBar />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }])(
    'opens on the document shortcut without an active modal (%j)',
    modifiers => {
      open = false;
      render(<CommandBar />);
      fireEvent.keyDown(document, { key: 'k', ...modifiers });
      expect(dispatch).toHaveBeenCalledWith(openCommandBar());
    },
  );

  it('runs sync-and-download when Sync all accounts is selected', () => {
    render(<CommandBar />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Sync all accounts' },
    });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(mutate).toHaveBeenCalledWith(
      {},
      { onSuccess: expect.any(Function) },
    );
  });

  it.each(['initial sync failed', 'final sync failed'])(
    'reports a resolved sync error (%s)',
    error => {
      mutate.mockImplementationOnce((_payload, { onSuccess }) =>
        onSuccess({ error }),
      );
      render(<CommandBar />);
      fireEvent.click(screen.getByText('Sync all accounts'));
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            notification: {
              type: 'error',
              message: 'There was an error syncing accounts. Please try again.',
            },
          },
        }),
      );
    },
  );

  it.each([true, { hasUpdated: false }])(
    'does not report an error for a successful sync (%j)',
    result => {
      mutate.mockImplementationOnce((_payload, { onSuccess }) =>
        onSuccess(result),
      );
      render(<CommandBar />);
      fireEvent.click(screen.getByText('Sync all accounts'));
      expect(
        dispatch.mock.calls.some(
          ([action]) => action.payload?.notification?.type === 'error',
        ),
      ).toBe(false);
    },
  );

  it('runs the tour handler with the translated command label', () => {
    render(<CommandBar />);
    expect(screen.getByText('Take a tour of Actual')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Take a tour of Actual'));

    expect(startTour).toHaveBeenCalledTimes(1);
  });

  it('saves the export and surfaces upstream backup safety warnings', async () => {
    vi.mocked(send).mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3]),
      warnings: ['exceeds-import-size-limit', 'may-exceed-available-memory'],
    });
    const saveFile = vi.fn().mockResolvedValue(undefined);
    window.Actual.saveFile = saveFile;
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Export budget data'));

    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith('export-budget');
    expect(saveFile).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      expect.stringMatching(/-Budget\.zip$/),
      'Export budget',
    );
    for (const id of [
      'export-exceeds-import-size-limit',
      'export-may-exceed-available-memory',
    ]) {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            notification: expect.objectContaining({
              id,
              type: 'warning',
              sticky: true,
            }),
          },
        }),
      );
    }
    const warningCalls = dispatch.mock.calls
      .map(([action], index) => ({
        action,
        order: dispatch.mock.invocationCallOrder[index],
      }))
      .filter(({ action }) => action.payload?.notification?.type === 'warning');
    expect(warningCalls).toHaveLength(2);
    expect(
      warningCalls.every(
        ({ order }) => order < saveFile.mock.invocationCallOrder[0],
      ),
    ).toBe(true);
  });

  it('notifies when the export request rejects without saving a file', async () => {
    vi.mocked(send).mockRejectedValueOnce(new Error('Disconnected'));
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Export budget data'));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            notification: expect.objectContaining({
              id: 'export-error',
              type: 'error',
            }),
          },
        }),
      ),
    );
    expect(window.Actual.saveFile).not.toHaveBeenCalled();
  });

  it('notifies when the export response has no archive', async () => {
    vi.mocked(send).mockResolvedValueOnce({ data: null, warnings: [] });
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Export budget data'));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            notification: expect.objectContaining({
              id: 'export-error',
              type: 'error',
            }),
          },
        }),
      ),
    );
    expect(window.Actual.saveFile).not.toHaveBeenCalled();
  });

  it('notifies when saving the archive rejects', async () => {
    vi.mocked(send).mockResolvedValueOnce({
      data: new Uint8Array([1]),
      warnings: [],
    });
    vi.mocked(window.Actual.saveFile).mockRejectedValueOnce(
      new Error('Save failed'),
    );
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Export budget data'));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            notification: expect.objectContaining({
              id: 'export-error',
              type: 'error',
            }),
          },
        }),
      ),
    );
  });

  it('does not let a pending catalog download override a newer built-in selection', async () => {
    let finishDownload: (css: string) => void = vi.fn();
    vi.mocked(fetchThemeCss).mockReturnValueOnce(
      new Promise(resolve => {
        finishDownload = resolve;
      }),
    );
    currentTheme = 'auto';
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Change theme…'));
    fireEvent.click(screen.getByText('Install community theme'));
    expect(fetchThemeCss).toHaveBeenCalledWith('example/community-theme');
    fireEvent.click(screen.getByText('Midnight'));
    await act(async () => {
      finishDownload(':root { --color-pageText: #123456; }');
    });
    expect(setLightTheme).toHaveBeenCalledTimes(1);
    expect(setDarkTheme).toHaveBeenCalledTimes(1);
    expect(switchTheme).toHaveBeenCalledExactlyOnceWith('midnight');
  });

  it('applies an uncontested catalog download', async () => {
    vi.mocked(fetchThemeCss).mockResolvedValueOnce(
      ':root { --color-pageText: #123456; }',
    );
    currentTheme = 'auto';
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Change theme…'));
    fireEvent.click(screen.getByText('Install community theme'));
    await waitFor(() => expect(setLightTheme).toHaveBeenCalledTimes(1));
    expect(JSON.parse(setLightTheme.mock.calls[0][0])).toMatchObject({
      name: catalogTheme.name,
      repo: 'https://github.com/example/community-theme',
    });
    expect(switchTheme).toHaveBeenCalledExactlyOnceWith('light');
  });

  it('ignores a pending theme download after the theme changes outside the palette', async () => {
    let finishDownload: (css: string) => void = vi.fn();
    vi.mocked(fetchThemeCss).mockReturnValueOnce(
      new Promise(resolve => {
        finishDownload = resolve;
      }),
    );
    currentTheme = 'auto';
    const view = render(<CommandBar />);
    fireEvent.click(screen.getByText('Change theme…'));
    fireEvent.click(screen.getByText('Install community theme'));
    currentTheme = 'midnight';
    view.rerender(<CommandBar />);
    await act(async () => {
      finishDownload(':root { --color-pageText: #123456; }');
    });
    expect(setLightTheme).not.toHaveBeenCalled();
    expect(switchTheme).not.toHaveBeenCalled();
  });

  it('ignores a pending theme download after unmounting', async () => {
    let finishDownload: (css: string) => void = vi.fn();
    vi.mocked(fetchThemeCss).mockReturnValueOnce(
      new Promise(resolve => {
        finishDownload = resolve;
      }),
    );
    const view = render(<CommandBar />);
    fireEvent.click(screen.getByText('Change theme…'));
    fireEvent.click(screen.getByText('Install community theme'));
    view.unmount();
    await act(async () => {
      finishDownload(':root { --color-pageText: #123456; }');
    });
    expect(setLightTheme).not.toHaveBeenCalled();
  });

  it('keeps the newest catalog selection when an older download finishes last', async () => {
    let finishDownload: (css: string) => void = vi.fn();
    vi.mocked(fetchThemeCss)
      .mockReturnValueOnce(
        new Promise(resolve => {
          finishDownload = resolve;
        }),
      )
      .mockResolvedValueOnce(':root { --color-pageText: #654321; }');
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Change theme…'));
    fireEvent.click(screen.getByText('Install community theme'));
    fireEvent.click(screen.getByText('Install newer theme'));
    await waitFor(() => expect(setLightTheme).toHaveBeenCalledTimes(1));
    await act(async () => {
      finishDownload(':root { --color-pageText: #123456; }');
    });
    expect(setLightTheme).toHaveBeenCalledTimes(1);
    expect(JSON.parse(setLightTheme.mock.calls[0][0])).toMatchObject({
      name: 'Newer theme',
    });
  });

  it('returns from themes on Escape without closing the palette', () => {
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Change theme…'));
    expect(screen.getByTestId('theme-page')).toBeInTheDocument();
    expect(screen.getByText('back')).toBeInTheDocument();
    dispatch.mockClear();

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });

    expect(screen.queryByTestId('theme-page')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('close')).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalledWith(closeCommandBar());
    expect(dispatch).not.toHaveBeenCalledWith(setCommandBarOpen(false));
  });
});
