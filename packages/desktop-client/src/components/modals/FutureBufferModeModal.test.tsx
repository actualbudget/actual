import { initServer } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { FutureBufferModeModal } from './FutureBufferModeModal';

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

const currentMonthName = monthUtils.format(
  monthUtils.currentMonth(),
  'MMMM yyyy',
);

function renderModal({ startMonth = '', manualHold = 0 } = {}) {
  sheetValues = {
    '__global!future-buffer-start': startMonth,
    buffered: manualHold,
  };
  const setMode = vi.fn();
  initServer({ 'budget/set-future-buffer-mode': setMode });
  render(
    <TestProviders>
      <FutureBufferModeModal />
    </TestProviders>,
  );
  return { setMode };
}

describe('FutureBufferModeModal', () => {
  it('turns automatic mode on from the current month', async () => {
    const { setMode } = renderModal();

    expect(
      screen.getByText(`Starts from ${currentMonthName}`),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Automatic' }));
    expect(
      screen.getByText(/comes out of this month's To Budget/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/This replaces the hold/),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(setMode).toHaveBeenCalledWith({ mode: 'automatic' });
  });

  it('says when it replaces a manual hold', async () => {
    renderModal({ manualHold: 70000 });

    await userEvent.click(screen.getByRole('button', { name: 'Automatic' }));

    expect(
      screen.getByText(
        new RegExp(`This replaces the hold you set for ${currentMonthName}\\.`),
      ),
    ).toBeInTheDocument();
  });

  it('turns automatic mode off', async () => {
    const { setMode } = renderModal({ startMonth: '2026-10' });

    await userEvent.click(screen.getByRole('button', { name: 'Manual' }));
    expect(
      screen.getByText(/keeps its current "For next month" amount/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(setMode).toHaveBeenCalledWith({ mode: 'manual' });
  });
});
