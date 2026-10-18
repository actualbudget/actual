import React from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { FinTSBank } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { FinTSConnectModal } from './FinTSConnectModal';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn(() => vi.fn()),
}));

const BANK: FinTSBank = {
  blz: '70150000',
  name: 'Stadtsparkasse München',
  city: 'München',
  url: 'https://fints.example/fints30',
};

function fakeServer({ bankListAvailable }: { bankListAvailable: boolean }) {
  // `send` is generic over every handler of the app; this fake only answers
  // the FinTS ones, hence the cast.
  vi.mocked(send).mockImplementation((async (
    name: string,
    args?: { blz?: string; connection?: object },
  ) => {
    switch (name) {
      case 'fints-status':
        return {
          configured: true,
          productIdFromConfig: true,
          bankListAvailable,
          connections: [],
        };
      case 'fints-bank-search':
        return { banks: [BANK] };
      case 'fints-bank-lookup':
        return { bank: args?.blz === BANK.blz ? BANK : null };
      case 'fints-connection-save':
        return { connection: { id: 'c1', ...args?.connection } };
      default:
        return {};
    }
  }) as typeof send);
}

function renderModal() {
  render(
    <TestProviders>
      <FinTSConnectModal />
    </TestProviders>,
  );
}

const savedConnection = () =>
  vi
    .mocked(send)
    .mock.calls.find(([name]) => name === 'fints-connection-save')?.[1];

describe('FinTSConnectModal', () => {
  beforeEach(() => {
    vi.mocked(send).mockReset();
  });

  it('takes the address from the bank list instead of asking for it', async () => {
    fakeServer({ bankListAvailable: true });
    renderModal();

    const bankField = await screen.findByRole('combobox');
    expect(
      screen.queryByLabelText('FinTS server address:'),
    ).not.toBeInTheDocument();

    await userEvent.type(bankField, 'stadtspar');
    await userEvent.click(await screen.findByRole('option'));
    expect(
      screen.getByText(`FinTS server address: ${BANK.url}`),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Login name or ID:'), 'me');
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    await userEvent.click(save);

    await waitFor(() =>
      expect(savedConnection()).toEqual({
        connection: expect.objectContaining({
          blz: BANK.blz,
          url: BANK.url,
          name: BANK.name,
          userId: 'me',
        }),
      }),
    );
  });

  it('asks for the address of a bank that is not in the list', async () => {
    fakeServer({ bankListAvailable: true });
    renderModal();

    await userEvent.type(await screen.findByRole('combobox'), '12345678');

    expect(
      await screen.findByText(/This bank is not in the FinTS bank list/),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name:'), 'My bank');
    await userEvent.type(screen.getByLabelText('Login name or ID:'), 'me');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText('FinTS server address:'),
      'https://fints.mybank.example',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('lets users enter a different address', async () => {
    fakeServer({ bankListAvailable: true });
    renderModal();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Use a different address' }),
    );

    expect(screen.getByLabelText('FinTS server address:')).toBeInTheDocument();
  });

  it('asks for the address when no bank list is configured', async () => {
    fakeServer({ bankListAvailable: false });
    renderModal();

    expect(
      await screen.findByLabelText('FinTS server address:'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
