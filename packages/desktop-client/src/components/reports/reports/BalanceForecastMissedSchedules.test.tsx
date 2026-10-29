import { useState } from 'react';

import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
  ForecastOccurrenceMatching,
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
  const [occurrenceMatching, setOccurrenceMatching] =
    useState<ForecastOccurrenceMatching>('recorded');
  return (
    <BalanceForecastMissedSchedules
      missedSchedules={missedSchedules}
      missedOccurrences={missedOccurrences}
      occurrenceMatching={occurrenceMatching}
      onSchedulesChange={setMissedSchedules}
      onOccurrencesChange={setMissedOccurrences}
      onMatchingChange={setOccurrenceMatching}
    />
  );
}

describe('Balance Forecast missed schedule controls', () => {
  it('lets testers switch matching strategies without changing recurrence scope', async () => {
    render(<Harness />);
    const matching = screen.getByLabelText('Payment matching (experimental)');
    expect(matching).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Include missed schedules'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Payments and transfers' }),
    );
    expect(matching).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Review occurrences' }),
    ).toBeVisible();
    await userEvent.click(matching);
    await userEvent.click(
      screen.getByRole('button', { name: 'Infer from dates' }),
    );
    expect(
      screen.getByText(/Skipped history can be mistaken for a payment/),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Review occurrences' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Occurrences per schedule')).toHaveTextContent(
      'All unmatched',
    );
    await userEvent.click(matching);
    await userEvent.click(
      screen.getByRole('button', { name: 'Use recorded occurrences' }),
    );
    expect(
      screen.getByText(
        /Older and manually linked payments still use date-based assumptions/,
      ),
    ).toBeVisible();
  });

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
