import { sendCatch } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { ApiKeys } from './ApiKeys';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  sendCatch: vi.fn(),
}));
const key = { id: 'key-id', name: 'Importer', fileId: 'budget', createdAt: 1 };
beforeEach(() => vi.resetAllMocks());

it('loads automatically and limits the list to this budget', async () => {
  vi.mocked(sendCatch).mockResolvedValueOnce({
    error: undefined,
    data: [key, { ...key, id: 'other', name: 'Other budget', fileId: 'other' }],
  });
  render(<ApiKeys fileId="budget" />, { wrapper: TestProviders });
  expect(await screen.findByText('Importer')).toBeInTheDocument();
  expect(screen.queryByText('Other budget')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /Retry|Reload|Manage keys/ }),
  ).not.toBeInTheDocument();
});

it('offers retry only after a failed load', async () => {
  vi.mocked(sendCatch).mockResolvedValueOnce({
    data: undefined,
    error: { type: 'ServerError', message: 'offline' },
  });
  render(<ApiKeys fileId="budget" />, { wrapper: TestProviders });
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load');
  expect(screen.getByRole('button', { name: 'Add key' })).toBeDisabled();
  vi.mocked(sendCatch).mockResolvedValueOnce({ error: undefined, data: [key] });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Importer')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Retry' }),
  ).not.toBeInTheDocument();
});
