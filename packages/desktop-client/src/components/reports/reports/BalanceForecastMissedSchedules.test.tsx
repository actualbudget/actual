import type { ReactNode } from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { BalanceForecastMissedSchedules } from './BalanceForecastMissedSchedules';

function render(ui: ReactNode) {
  return rtlRender(ui, { wrapper: TestProviders });
}

const handlers = {
  onMissedSchedulesChange: vi.fn(),
  onMissedOccurrencesChange: vi.fn(),
};

describe('BalanceForecastMissedSchedules', () => {
  it('stays quiet while missed schedules are left out', () => {
    render(
      <BalanceForecastMissedSchedules
        missedSchedules="exclude"
        missedOccurrences="one"
        {...handlers}
      />,
    );

    expect(screen.getByLabelText('Occurrences per schedule')).toBeDisabled();
    expect(screen.queryByText(/assumed to be paid today/)).toBeNull();
  });

  it('explains the assumptions and limits of an included mode', () => {
    render(
      <BalanceForecastMissedSchedules
        missedSchedules="payments"
        missedOccurrences="all"
        {...handlers}
      />,
    );

    expect(screen.getByLabelText('Occurrences per schedule')).toBeEnabled();
    expect(screen.getByText(/assumed to be paid today/)).toBeInTheDocument();
    expect(screen.getByText(/Missed income is left out/)).toBeInTheDocument();
    expect(
      screen.getByText(/Skipped occurrences cannot be reconstructed/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Matching payments to individual occurrences/),
    ).toBeInTheDocument();
  });

  it('says why a range without today cannot include them', () => {
    render(
      <BalanceForecastMissedSchedules
        missedSchedules="all"
        missedOccurrences="one"
        unsupportedReason="today-outside-range"
        {...handlers}
      />,
    );

    expect(
      screen.getByText(/this range does not include today/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/assumed to be paid today/)).toBeNull();
    expect(screen.queryByText(/Missed income is left out/)).toBeNull();
  });
});
