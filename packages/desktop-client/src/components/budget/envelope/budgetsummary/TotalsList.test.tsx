import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { TotalsList } from './TotalsList';

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

const tooltip = /Held automatically for what your future months need/;

function renderList({ startMonth = '2026-10' } = {}) {
  sheetValues = { '__global!future-buffer-start': startMonth, frozen: 0 };
  render(
    <TestProviders>
      <TotalsList month="2026-10" prevMonthName="Sep" />
    </TestProviders>,
  );
}

describe('TotalsList', () => {
  it('explains the automatic buffer on the For next month row', async () => {
    renderList();

    await userEvent.hover(screen.getByText('For next month'));

    expect(await screen.findByText(tooltip)).toBeInTheDocument();
  });

  it('has no explanation in manual mode', async () => {
    renderList({ startMonth: '' });

    await userEvent.hover(screen.getByText('For next month'));

    expect(screen.queryByText(tooltip)).not.toBeInTheDocument();
  });
});
