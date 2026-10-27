import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SheetNameProvider } from '#hooks/useSheetName';
import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ToBudgetMenu } from './ToBudgetMenu';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let sheetValues: Record<string, number | string | null> = {};

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    return sheetValues[name] ?? null;
  },
}));

const START_MONTH = '2026-10';

function setSheetValues({
  startMonth = START_MONTH,
  frozen = 0,
  manualHold = 0,
  autoHold = 0,
}: {
  startMonth?: string;
  frozen?: number;
  manualHold?: number;
  autoHold?: number;
} = {}) {
  sheetValues = {
    '__global!future-buffer-start': startMonth,
    frozen,
    'to-budget': 10000,
    'buffered-selected': manualHold || autoHold,
    buffered: manualHold,
    'buffered-auto': autoHold,
  };
}

function renderMenu(month: string, { isFlagOn = false } = {}) {
  const store = createTestAppStore();
  if (isFlagOn) {
    store.dispatch(mergeSyncedPrefs({ 'flags.futureBufferMode': 'true' }));
  }
  // A fresh element each time, so a rerender reaches the menu
  const ui = () => (
    <TestProviders store={store}>
      <SheetNameProvider name={`budget${month.replace('-', '')}`}>
        <ToBudgetMenu
          month={month}
          onTransfer={vi.fn()}
          onCover={vi.fn()}
          onHoldBuffer={vi.fn()}
          onResetHoldBuffer={vi.fn()}
          onBudgetAction={vi.fn()}
        />
      </SheetNameProvider>
    </TestProviders>
  );
  const result = render(ui());
  return { store, rerender: () => result.rerender(ui()) };
}

const hold = 'Hold for next month';
const reset = "Reset next month's buffer";
const disableAutoHold = 'Disable current auto hold';

describe('ToBudgetMenu in automatic mode', () => {
  it('hides the manual controls in a managed month', () => {
    setSheetValues({ manualHold: 5000 });
    const { rerender } = renderMenu('2026-11');

    expect(screen.getByText('Move to a category')).toBeInTheDocument();
    expect(screen.queryByText(hold)).not.toBeInTheDocument();
    expect(screen.queryByText(reset)).not.toBeInTheDocument();

    setSheetValues({ autoHold: 5000 });
    rerender();
    expect(screen.queryByText(disableAutoHold)).not.toBeInTheDocument();
  });

  it('offers hold and reset in a frozen month, but not the auto hold', () => {
    setSheetValues({ frozen: 1, autoHold: 5000 });
    const { rerender } = renderMenu(START_MONTH);

    expect(screen.getByText(hold)).toBeInTheDocument();
    expect(screen.queryByText(disableAutoHold)).not.toBeInTheDocument();

    setSheetValues({ frozen: 1, manualHold: 5000 });
    rerender();
    expect(screen.getByText(reset)).toBeInTheDocument();
  });

  it('leaves the months before the start month as they are', () => {
    setSheetValues({ autoHold: 5000 });
    renderMenu('2026-09');

    expect(screen.queryByText(hold)).not.toBeInTheDocument();
    expect(screen.getByText(disableAutoHold)).toBeInTheDocument();
  });

  it('shows the mode item even with the flag off', () => {
    setSheetValues();
    renderMenu(START_MONTH);

    expect(screen.getByText('For next month: Automatic…')).toBeInTheDocument();
  });

  it('follows a mode change that arrives through the sheet', () => {
    setSheetValues({ manualHold: 5000 });
    const { rerender } = renderMenu('2026-11', { isFlagOn: true });
    expect(screen.queryByText(reset)).not.toBeInTheDocument();

    setSheetValues({ startMonth: '', manualHold: 5000 });
    rerender();

    expect(screen.getByText(reset)).toBeInTheDocument();
    expect(screen.getByText('For next month: Manual…')).toBeInTheDocument();
  });
});

describe('ToBudgetMenu in manual mode', () => {
  it('shows the mode item only with the flag on, and opens the modal', async () => {
    setSheetValues({ startMonth: '' });
    renderMenu(START_MONTH);
    expect(screen.queryByText(/^For next month:/)).not.toBeInTheDocument();

    const { store } = renderMenu(START_MONTH, { isFlagOn: true });
    await userEvent.click(screen.getByText('For next month: Manual…'));

    expect(store.getState().modals.modalStack).toEqual([
      { name: 'future-buffer-mode' },
    ]);
  });
});
