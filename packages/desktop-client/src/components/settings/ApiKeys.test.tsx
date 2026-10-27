import { sendCatch } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ApiKeys } from './ApiKeys';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  sendCatch: vi.fn(),
}));

const key = { id: 'key-id', name: 'Importer', fileId: 'budget', createdAt: 1 };

beforeEach(() => vi.resetAllMocks());

it('limits the list to this budget and confirms revocation', async () => {
  vi.mocked(sendCatch).mockResolvedValueOnce({
    error: undefined,
    data: [key, { ...key, id: 'other', name: 'Other budget', fileId: 'other' }],
  });
  const user = userEvent.setup();
  render(<ApiKeys fileId="budget" />);
  await user.click(screen.getByRole('button', { name: 'Manage keys' }));
  expect(await screen.findByText('Importer')).toBeInTheDocument();
  expect(screen.queryByText('Other budget')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Revoke Importer' }));
  expect(sendCatch).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(sendCatch).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Revoke Importer' }));
  vi.mocked(sendCatch).mockResolvedValueOnce({
    error: undefined,
    data: undefined,
  });
  await user.click(screen.getByRole('button', { name: 'Revoke key' }));
  await waitFor(() =>
    expect(screen.queryByText('Importer')).not.toBeInTheDocument(),
  );
  expect(sendCatch).toHaveBeenLastCalledWith('api-keys-revoke', {
    id: 'key-id',
  });
});

it('reveals a new secret once and clears it on completion', async () => {
  vi.mocked(sendCatch).mockResolvedValueOnce({ error: undefined, data: [] });
  const user = userEvent.setup();
  render(<ApiKeys fileId="budget" />);
  await user.click(screen.getByRole('button', { name: 'Manage keys' }));
  await user.type(await screen.findByLabelText('Key name'), ' Importer ');
  vi.mocked(sendCatch).mockResolvedValueOnce({
    error: undefined,
    data: { ...key, key: 'actual_test-secret' },
  });
  await user.click(screen.getByRole('button', { name: 'Create key' }));
  expect(sendCatch).toHaveBeenLastCalledWith('api-keys-create', {
    name: 'Importer',
    fileId: 'budget',
  });
  expect(await screen.findByDisplayValue('actual_test-secret')).toHaveAttribute(
    'readonly',
  );
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(
    screen.queryByDisplayValue('actual_test-secret'),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Importer')).toBeInTheDocument();
});

it('allows recovery from load and revoke failures without removing the key', async () => {
  const user = userEvent.setup();
  vi.mocked(sendCatch).mockResolvedValueOnce({
    data: undefined,
    error: { type: 'ServerError', message: 'offline' },
  });
  render(<ApiKeys fileId="budget" />);
  await user.click(screen.getByRole('button', { name: 'Manage keys' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load');
  vi.mocked(sendCatch).mockResolvedValueOnce({ error: undefined, data: [key] });
  await user.click(screen.getByRole('button', { name: 'Manage keys' }));
  await user.click(
    await screen.findByRole('button', { name: 'Revoke Importer' }),
  );
  vi.mocked(sendCatch).mockResolvedValueOnce({
    data: undefined,
    error: { type: 'ServerError', message: 'offline' },
  });
  await user.click(screen.getByRole('button', { name: 'Revoke key' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not revoke',
  );
  expect(screen.getByText('Importer')).toBeInTheDocument();
});
