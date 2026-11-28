import { send } from '@actual-app/core/platform/client/connection';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandBar } from './CommandBar';

const dispatch = vi.fn();
const mutate = vi.fn();
const startTour = vi.fn();
let modalStack: unknown[] = [];
let open = true;

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
  useGlobalPref: () => [null, vi.fn()],
}));
vi.mock('#style', () => ({ useTheme: () => ['light', vi.fn()] }));
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
  ThemePage: () => <div data-testid="theme-page" />,
  isThemePageEscape: (key: string, page: string) =>
    key === 'Escape' && page === 'themes',
}));

describe('CommandBar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modalStack = [];
    open = true;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('stays closed when Ctrl/Cmd+K is pressed over an active modal', () => {
    open = false;
    modalStack = [{}];
    render(<CommandBar />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('runs sync-and-download when Sync all accounts is selected', () => {
    render(<CommandBar />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Sync all accounts' },
    });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(mutate).toHaveBeenCalledWith({});
  });

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
  });

  it('returns from themes on Escape without closing the palette', () => {
    render(<CommandBar />);
    fireEvent.click(screen.getByText('Change theme…'));
    expect(screen.getByTestId('theme-page')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('theme-page')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
