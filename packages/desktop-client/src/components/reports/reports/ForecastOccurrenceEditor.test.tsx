import { send } from '@actual-app/core/platform/client/connection';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTestProviders, TestProviders } from '#mocks';

import { ForecastOccurrenceEditor } from './ForecastOccurrenceEditor';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn(() => vi.fn()),
}));
vi.mock('#hooks/useSchedules', () => ({
  useSchedules: () => ({
    schedules: [
      { id: 'daily', name: 'Daily bill', next_date: '2024-03-10' },
      { id: 'other', name: 'Other bill', next_date: '2024-03-15' },
    ],
    isLoading: false,
  }),
}));
vi.mock('#hooks/useFormat', () => ({
  useFormat: () => (amount: number) => String(amount / 100),
}));
vi.mock('#hooks/usePrivacyMode', () => ({ usePrivacyMode: () => false }));

beforeEach(() => {
  resetTestProviders();
  vi.clearAllMocks();
  vi.mocked(send).mockResolvedValue({
    records: [],
    payments: [
      { transactionId: 'payment', date: '2024-03-09', amount: -30_000 },
    ],
  });
});

async function selectSchedule() {
  render(<ForecastOccurrenceEditor />, { wrapper: TestProviders });
  await userEvent.click(screen.getByLabelText('Schedule to review'));
  await userEvent.click(screen.getByRole('button', { name: 'Daily bill' }));
  await screen.findByText(
    'No record for this date. Matching will be inferred.',
  );
}

describe('forecast occurrence editor', () => {
  it('records the selected due date and payment and resets when changing schedule', async () => {
    await selectSchedule();
    expect(
      screen.getByRole('button', { name: 'Record payment' }),
    ).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Linked payment'));
    await userEvent.click(
      screen.getByRole('button', { name: '2024-03-09 · -300' }),
    );
    fireEvent.change(screen.getByLabelText('Occurrence due date'), {
      target: { value: '2024-03-11' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Record payment' }),
    );
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith('schedule/set-occurrence', {
        scheduleId: 'daily',
        dueDate: '2024-03-11',
        resolution: { status: 'paid', transactionId: 'payment' },
      }),
    );
    await screen.findByText('Occurrence saved.');
    await userEvent.click(screen.getByLabelText('Schedule to review'));
    await userEvent.click(screen.getByRole('button', { name: 'Other bill' }));
    expect(screen.getByLabelText('Occurrence due date')).toHaveValue(
      '2024-03-15',
    );
    expect(
      screen.getByRole('button', { name: 'Record payment' }),
    ).toBeDisabled();
    expect(screen.queryByText('Occurrence saved.')).not.toBeInTheDocument();
  });

  it('shows a rejected resolution without presenting it as saved', async () => {
    await selectSchedule();
    vi.mocked(send).mockRejectedValueOnce(
      new Error('Choose an existing occurrence date for this schedule.'),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Record as skipped' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose an existing occurrence date',
    );
    expect(screen.queryByText('Occurrence saved.')).not.toBeInTheDocument();
  });
});
