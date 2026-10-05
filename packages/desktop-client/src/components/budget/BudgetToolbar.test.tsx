import React from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { BudgetToolbar } from './BudgetToolbar';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const monthBounds = { start: '2026-01', end: '2027-06' };

function renderToolbar({
  startMonth = '2026-10',
  numMonths = 2,
  maxSelectableMonthCount = 4,
  onMonthSelect = vi.fn(),
}: {
  startMonth?: string;
  numMonths?: number;
  maxSelectableMonthCount?: number;
  onMonthSelect?: (month: string) => void;
} = {}) {
  render(
    <TestProviders>
      <BudgetToolbar
        startMonth={startMonth}
        numMonths={numMonths}
        maxSelectableMonthCount={maxSelectableMonthCount}
        monthBounds={monthBounds}
        onMonthSelect={onMonthSelect}
      />
    </TestProviders>,
  );

  return { onMonthSelect };
}

describe('BudgetToolbar', () => {
  it('shows the displayed month range on a single trigger', () => {
    renderToolbar();

    const triggers = screen.getAllByTestId('selected-budget-month');
    expect(triggers).toHaveLength(1);
    expect(triggers[0]).toHaveAttribute('data-month', '2026-10');
    expect(triggers[0]).toHaveTextContent('Oct – Nov 2026');
  });

  it('navigates to the current, previous and next month', async () => {
    const user = userEvent.setup();
    const { onMonthSelect } = renderToolbar();

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(onMonthSelect).toHaveBeenLastCalledWith(monthUtils.currentMonth());

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onMonthSelect).toHaveBeenLastCalledWith('2026-09');

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onMonthSelect).toHaveBeenLastCalledWith('2026-11');
  });

  it('disables the previous arrow at the start of the budget', () => {
    renderToolbar({ startMonth: '2026-01' });

    expect(
      screen.getByRole('button', { name: 'Previous month' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled();
  });

  it('disables the next arrow when the last displayed month is the end of the budget', () => {
    renderToolbar({ startMonth: '2027-05', numMonths: 2 });

    expect(
      screen.getByRole('button', { name: 'Previous month' }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('jumps to a month picked from the dropdown', async () => {
    const user = userEvent.setup();
    const { onMonthSelect } = renderToolbar();

    await user.click(screen.getByTestId('selected-budget-month'));
    await user.click(screen.getByRole('button', { name: 'March 2026' }));

    expect(onMonthSelect).toHaveBeenCalledWith('2026-03');
  });

  it('offers one segment per month that fits and marks the displayed count', () => {
    renderToolbar({ numMonths: 2, maxSelectableMonthCount: 4 });

    const selector = screen.getByRole('group', {
      name: 'Choose the number of months shown at a time',
    });
    const segments = within(selector).getAllByRole('button');

    expect(segments.map(segment => segment.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(
      segments.map(segment => segment.getAttribute('aria-pressed')),
    ).toEqual(['false', 'true', 'false', 'false']);
  });

  it('hides the month count selector when only one month fits', () => {
    renderToolbar({ numMonths: 1, maxSelectableMonthCount: 1 });

    expect(
      screen.queryByRole('group', {
        name: 'Choose the number of months shown at a time',
      }),
    ).not.toBeInTheDocument();
  });
});
