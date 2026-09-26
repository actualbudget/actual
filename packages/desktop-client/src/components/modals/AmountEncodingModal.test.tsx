import { HotkeysProvider } from 'react-hotkeys-hook';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { AmountEncodingModal } from './AmountEncodingModal';

const metadataPrefs = vi.hoisted(
  () => ({ id: 'budget' }) as Record<string, unknown>,
);

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#hooks/useMetadataPref', () => ({
  useMetadataPref: (name: string) => [metadataPrefs[name]],
}));

it.each([true, false])(
  'keeps backup confirmation optional when backup history is available: %s',
  async available => {
    const transition = vi.fn(async () => ({}));
    initServer({
      'backups-get': async () => {
        if (!available) throw new Error('Backup history unavailable');
        return [
          { id: 'latest', date: null, isLatest: true },
          { id: 'recent', date: '2026-09-22 10:30' },
          { id: 'older', date: '2026-09-21 09:00' },
        ];
      },
      'amount-encoding/preflight': async () => ({
        sourceToken: 'source',
        source: { version: 0, currencyCode: 'USD', precision: 2 },
        target: { version: 1, currencyCode: 'USD', precision: 2 },
        pending: false,
      }),
      'amount-encoding/transition': transition,
    });
    render(
      <TestProviders>
        <MemoryRouter>
          <HotkeysProvider>
            <AmountEncodingModal currencyCode="USD" />
          </HotkeysProvider>
        </MemoryRouter>
      </TestProviders>,
    );
    const button = await screen.findByRole('button', {
      name: 'Continue',
    });
    await waitFor(() => expect(button).toBeEnabled());
    if (available) {
      expect(
        await screen.findByText('Last recorded local backup: 2026-09-22 10:30'),
      ).toBeVisible();
    } else {
      expect(
        screen.queryByText(/Last recorded local backup/),
      ).not.toBeInTheDocument();
    }
    expect(
      screen.getByRole('checkbox', { name: 'I have made a backup' }),
    ).not.toBeChecked();
    await userEvent.click(button);
    await waitFor(() => expect(transition).toHaveBeenCalled());
  },
);

it('selects a currency in the modal when the budget has none', async () => {
  const preflight = vi.fn(
    async ({ currencyCode }: { currencyCode: string }) => {
      if (!currencyCode) throw new Error('amount-encoding-currency-required');
      return {
        sourceToken: 'source',
        source: { version: 0 as const, currencyCode: '', precision: 2 },
        target: { version: 1 as const, currencyCode, precision: 0 },
        pending: false,
      };
    },
  );
  const transition = vi.fn(async () => ({}));
  initServer({
    'backups-get': async () => [],
    'amount-encoding/preflight': preflight,
    'amount-encoding/transition': transition,
  });
  render(
    <TestProviders>
      <MemoryRouter>
        <HotkeysProvider>
          <AmountEncodingModal currencyCode="" />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );

  await userEvent.click(
    await screen.findByRole('button', { name: 'Select a currency' }),
  );
  expect(
    screen.queryByRole('button', { name: 'None' }),
  ).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', { name: 'JPY - Japanese Yen (¥)' }),
  );
  const confirm = await screen.findByRole('button', {
    name: 'Confirm precision change',
  });
  await waitFor(() => expect(confirm).toBeEnabled());
  await userEvent.click(confirm);
  await waitFor(() =>
    expect(transition).toHaveBeenCalledWith({
      currencyCode: 'JPY',
      sourceToken: 'source',
    }),
  );
});
it('keeps the graduation prompt open and links to existing backup settings', async () => {
  initServer({
    'backups-get': async () => [],
    'amount-encoding/preflight': async () => ({
      sourceToken: 'source',
      source: { version: 0, currencyCode: 'JPY', precision: 2 },
      target: { version: 1, currencyCode: 'JPY', precision: 0 },
      pending: false,
    }),
  });
  render(
    <TestProviders>
      <MemoryRouter>
        <HotkeysProvider>
          <AmountEncodingModal currencyCode="JPY" required />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  expect(
    screen.getByRole('link', { name: 'Go to backup and export settings' }),
  ).toHaveAttribute('href', '/settings/general#export-data');
  expect(
    await screen.findByRole('button', { name: 'Confirm precision change' }),
  ).toBeEnabled();
});

it('does not retry a pending change for a different currency', async () => {
  metadataPrefs.amountEncodingTransition = {
    id: 'pending',
    sourceGroupId: 'group',
    sourceEncoding: null,
    targetEncoding: null,
    targetCurrencyCode: 'KWD',
  };
  onTestFinished(() => {
    delete metadataPrefs.amountEncodingTransition;
  });
  const retry = vi.fn(async () => ({}));
  const transition = vi.fn(async () => ({}));
  initServer({
    'backups-get': async () => [],
    'amount-encoding/preflight': async () => ({
      sourceToken: 'source',
      source: { version: 1, currencyCode: 'KWD', precision: 3 },
      target: { version: 1, currencyCode: 'EUR', precision: 2 },
      pending: true,
    }),
    'amount-encoding/retry': retry,
    'amount-encoding/transition': transition,
  });
  render(
    <TestProviders>
      <MemoryRouter>
        <HotkeysProvider>
          <AmountEncodingModal currencyCode="EUR" />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );

  expect(
    await screen.findByText(
      'Finish the KWD change before choosing another currency.',
    ),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Confirm precision change' }),
  ).toBeDisabled();
  expect(retry).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: /EUR/ }));
  await userEvent.click(screen.getByRole('button', { name: /KWD/ }));
  const retryButton = await screen.findByRole('button', {
    name: 'Retry precision change',
  });
  await waitFor(() => expect(retryButton).toBeEnabled());
  await userEvent.click(retryButton);
  await waitFor(() => expect(retry).toHaveBeenCalledOnce());
  expect(transition).not.toHaveBeenCalled();
});
