import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { TotalsList } from './TotalsList';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let sheetValues: Record<string, number | boolean | null> = {};

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    return sheetValues[name] ?? null;
  },
}));

const tooltip = /Held automatically for what your future months need/;

function renderList() {
  sheetValues = { 'buffered-managed': true };
  render(
    <TestProviders>
      <TotalsList prevMonthName="Sep" />
    </TestProviders>,
  );
}

describe('TotalsList', () => {
  it('explains the automatic buffer on the For next month row', async () => {
    renderList();

    await userEvent.hover(screen.getByText('For next month'));

    expect(await screen.findByText(tooltip)).toBeInTheDocument();
  });
});
