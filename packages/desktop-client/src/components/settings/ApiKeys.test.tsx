import { sendCatch } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { useServerVersion } from '#components/ServerContext';
import { TestProviders } from '#mocks';

import { ApiKeys } from './ApiKeys';

vi.mock('#components/ServerContext', () => ({ useServerVersion: vi.fn() }));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  sendCatch: vi.fn(),
}));
const key = {
  id: 'key-id',
  name: 'Importer',
  fileIds: ['other', 'budget'],
  createdAt: 1,
};
beforeEach(() => vi.resetAllMocks());

it.each(['', 'v26.11.0'])(
  'loads successfully even when the server version is %j',
  async version => {
    vi.mocked(useServerVersion).mockReturnValue(version);
    vi.mocked(sendCatch).mockResolvedValueOnce({
      error: undefined,
      data: [
        key,
        { ...key, id: 'other', name: 'Other budget', fileIds: ['other'] },
      ],
    });
    render(<ApiKeys fileId="budget" />, {
      wrapper: TestProviders,
    });
    expect(await screen.findByText('Importer')).toBeInTheDocument();
    expect(sendCatch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Other budget')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry' }),
    ).not.toBeInTheDocument();
  },
);

it.each(['', 'N/A', 'nightly', 'v26.11.0', 'v26.12.0'])(
  'explains failed requests according to the server version %j',
  async version => {
    vi.mocked(useServerVersion).mockReturnValue(version);
    vi.mocked(sendCatch).mockResolvedValueOnce({
      data: undefined,
      error: { type: 'ServerError', message: 'offline' },
    });
    render(<ApiKeys fileId="budget" />, {
      wrapper: TestProviders,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      version === 'v26.11.0'
        ? 'Requires server version 26.12.0 or newer.'
        : 'Failed to load API keys. Please try again.',
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
    expect(sendCatch).toHaveBeenCalledTimes(1);
  },
);
