import { initServer } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SheetNameProvider } from '#hooks/useSheetName';
import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import { TestProviders } from '#mocks';

import { FutureBufferModeModal } from './FutureBufferModeModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const currentMonth = monthUtils.currentMonth();
const currentMonthName = monthUtils.format(currentMonth, 'MMMM yyyy');

// The real sheet hooks, answered by a fake server: the cells arrive after
// the first render, as they do in the app.
function renderModal({ startMonth = '', manualHold = 0 } = {}) {
  const cells: Record<string, string | number> = {
    '__global!future-buffer-start': startMonth,
    [`${monthUtils.sheetForMonth(currentMonth)}!buffered`]: manualHold,
  };
  const setMode = vi.fn();
  initServer({
    'get-cell': async ({ sheetName, name }) => {
      const fullName = `${sheetName}!${name}`;
      return { name: fullName, value: cells[fullName] ?? null };
    },
    'budget/set-future-buffer-mode': setMode,
  });
  render(
    <TestProviders>
      <SpreadsheetProvider>
        <SheetNameProvider name={monthUtils.sheetForMonth(currentMonth)}>
          <FutureBufferModeModal />
        </SheetNameProvider>
      </SpreadsheetProvider>
    </TestProviders>,
  );
  return { setMode };
}

const choice = (name: string, pressed: boolean) =>
  screen.findByRole('button', { name, pressed });

describe('FutureBufferModeModal', () => {
  it('turns automatic mode on from the current month', async () => {
    const { setMode } = renderModal({ manualHold: 70000 });
    await choice('Manual', true);

    expect(
      screen.getByText(`Starts from ${currentMonthName}`),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Automatic' }));
    expect(
      screen.getByText(/comes out of this month's To Budget/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`This replaces the hold you set for ${currentMonthName}\\.`),
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(setMode).toHaveBeenCalledWith({ mode: 'automatic' });
  });

  it('turns automatic mode off', async () => {
    const { setMode } = renderModal({ startMonth: '2026-10' });
    await choice('Automatic', true);

    await userEvent.click(screen.getByRole('button', { name: 'Manual' }));
    expect(
      screen.getByText(/keeps its current "For next month" amount/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(setMode).toHaveBeenCalledWith({ mode: 'manual' });
  });
});
