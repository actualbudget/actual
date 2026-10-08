import { useState } from 'react';

import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
} from '@actual-app/core/types/models/forecast';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BalanceForecastMissedSchedules } from './BalanceForecastMissedSchedules';

function Harness() {
  const [missedSchedules, setMissedSchedules] =
    useState<ForecastMissedSchedules>('exclude');
  const [missedOccurrences, setMissedOccurrences] =
    useState<ForecastMissedOccurrences>('all');
  return (
    <BalanceForecastMissedSchedules
      missedSchedules={missedSchedules}
      missedOccurrences={missedOccurrences}
      onSchedulesChange={setMissedSchedules}
      onOccurrencesChange={setMissedOccurrences}
    />
  );
}

describe('Balance Forecast missed schedule controls', () => {
  it('retains recurrence scope while inclusion is disabled and re-enabled', async () => {
    render(<Harness />);
    expect(screen.getByLabelText('Occurrences per schedule')).toBeDisabled();
    expect(screen.getByLabelText('Occurrences per schedule')).toHaveTextContent(
      'All unmatched',
    );
    await userEvent.click(screen.getByLabelText('Include missed schedules'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Payments and transfers' }),
    );
    expect(screen.getByLabelText('Occurrences per schedule')).toBeEnabled();
    expect(screen.getByLabelText('Occurrences per schedule')).toHaveTextContent(
      'All unmatched',
    );
    expect(
      screen.getByText(/Assume included missed occurrences happen today/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Occurrences per schedule'));
    await userEvent.click(
      screen.getByRole('button', { name: 'One (oldest unmatched)' }),
    );
    expect(screen.getByLabelText('Occurrences per schedule')).toHaveTextContent(
      'One (oldest unmatched)',
    );
    await userEvent.click(screen.getByLabelText('Include missed schedules'));
    await userEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(screen.getByLabelText('Occurrences per schedule')).toBeDisabled();
    expect(screen.getByLabelText('Occurrences per schedule')).toHaveTextContent(
      'One (oldest unmatched)',
    );
  });
});
