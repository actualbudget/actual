import { HotkeysProvider } from 'react-hotkeys-hook';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ForeignAmountModal } from './ForeignAmountModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const draft = {
  id: 'draft',
  account: 'jpy',
  date: '2026-03-10',
  transaction_amount: -1500,
};

type Resolution =
  | {
      status: 'resolved';
      rate: string;
      kind: 'dated' | 'standing' | 'fetched' | 'explicit';
      source: string;
      timestamp: string;
      fallback: boolean;
    }
  | { status: 'unavailable' };

function setup(resolution: Resolution, post = vi.fn()) {
  initServer({
    'exchange-rates/resolve': async () => resolution,
    'transactions/post-foreign-entry': post,
  });
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
    }),
  );
  const onPosted = vi.fn();
  render(
    <TestProviders store={store}>
      <MemoryRouter>
        <HotkeysProvider>
          <ForeignAmountModal
            transaction={draft}
            currencyCode="JPY"
            nativePrecision={0}
            onPosted={onPosted}
          />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { post, onPosted };
}

async function field(name: string) {
  return waitFor(() => {
    const element = document.querySelector<HTMLInputElement>(
      `input[name="${name}"]`,
    );
    assert(element, `Expected ${name} input`);
    return element;
  });
}

const standing = {
  status: 'resolved',
  rate: '150',
  kind: 'standing',
  source: 'manual',
  timestamp: '2026-01-01T00:00:00.000Z',
  fallback: false,
} as const;

describe('ForeignAmountModal', () => {
  it('shows the resolved default and posts exactly that base amount', async () => {
    const { post, onPosted } = setup(
      standing,
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    expect(await screen.findByText(/at 1 USD = 150 JPY/)).toHaveTextContent(
      /\(standing, manual, 2026-01-01\)/,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction: draft,
          baseAmount: -1000,
          replaceRate: false,
        }),
      ),
    );
    expect(onPosted).toHaveBeenCalled();
  });

  it('marks a fallback rate', async () => {
    setup({ ...standing, kind: 'fetched', source: 'provider', fallback: true });
    expect(
      await screen.findByText('Nearest earlier rate used.'),
    ).toBeInTheDocument();
  });

  it('requires an input when no rate is available', async () => {
    const { post } = setup({ status: 'unavailable' });
    expect(
      await screen.findAllByText(
        'Rate unavailable. Enter a base amount or rate.',
      ),
    ).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(post).not.toHaveBeenCalled();
  });

  it('posts an explicit base amount override', async () => {
    const { post } = setup(
      { status: 'unavailable' },
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    await userEvent.type(await field('baseAmount'), '12.34');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({ baseAmount: -1234 }),
      ),
    );
  });

  it('posts a rate override with the base it shows, then confirms replacement', async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'rate-confirmation-required',
        existing: { rate: '150' },
      })
      .mockResolvedValueOnce({ status: 'ok', id: 'draft' });
    setup(standing, post);
    await userEvent.type(await field('rate'), '125');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          rate: '125',
          expectedBaseAmount: -1200,
          replaceRate: false,
        }),
      ),
    );
    expect(
      await screen.findByText(
        /A standing rate of 1 USD = 150 JPY is already saved/,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ rate: '125', replaceRate: true }),
      ),
    );
  });

  it('reopens the conversion when a rule changes the date', async () => {
    const resolve = vi.fn(async () => standing);
    const post = vi.fn().mockResolvedValueOnce({
      status: 'rule-date-changed',
      date: '2026-03-11',
    });
    initServer({
      'exchange-rates/resolve': resolve,
      'transactions/post-foreign-entry': post,
    });
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        defaultCurrencyCode: 'USD',
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'USD',
          precision: 2,
        }),
      }),
    );
    render(
      <TestProviders store={store}>
        <MemoryRouter>
          <HotkeysProvider>
            <ForeignAmountModal
              transaction={draft}
              currencyCode="JPY"
              nativePrecision={0}
              onPosted={vi.fn()}
            />
          </HotkeysProvider>
        </MemoryRouter>
      </TestProviders>,
    );
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(/A rule changed the date to 2026-03-11/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(resolve).toHaveBeenLastCalledWith({
        quoteCurrency: 'JPY',
        date: '2026-03-11',
      }),
    );
  });

  it('reports an incompatible rule move without saving', async () => {
    setup(
      standing,
      vi.fn(async () => ({ status: 'rule-account-incompatible' })),
    );
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(
        /move this transaction to an account in another currency/,
      ),
    ).toBeInTheDocument();
  });

  it('shows the conversion for an entered rate before saving it', async () => {
    setup(standing);
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.type(await field('rate'), '125');
    expect(
      await screen.findByText(/12\.00 at the entered rate/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/at 1 USD = 150 JPY/)).not.toBeInTheDocument();
  });

  it('takes a rate in either direction and posts the stored form', async () => {
    const { post } = setup(
      { status: 'unavailable' },
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    expect(screen.getByText('1 USD =')).toBeInTheDocument();
    await userEvent.type(await field('rate'), '125');
    await userEvent.click(
      screen.getByRole('button', { name: 'Swap rate direction' }),
    );
    // The typed rate keeps its meaning after the swap.
    expect(await field('rate')).toHaveValue('0.008');
    expect(screen.getByText('1 JPY =')).toBeInTheDocument();
    await userEvent.clear(await field('rate'));
    await userEvent.type(await field('rate'), '0.0064');
    expect(
      await screen.findByText(/9\.60 at the entered rate/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({ rate: '156.25', expectedBaseAmount: -960 }),
      ),
    );
  });

  it('confirms the server-computed base after base-changed', async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ status: 'base-changed', baseAmount: -1201 })
      .mockResolvedValueOnce({ status: 'ok', id: 'draft' });
    setup(standing, post);
    await userEvent.type(await field('rate'), '125');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(/12\.01 at the entered rate/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ rate: '125', expectedBaseAmount: -1201 }),
      ),
    );
  });

  it('does not post the old default while the new date resolves', async () => {
    let finish: (value: Resolution) => void = () => undefined;
    const resolve = vi
      .fn()
      .mockResolvedValueOnce(standing)
      .mockImplementationOnce(
        () => new Promise<Resolution>(done => (finish = done)),
      );
    const post = vi.fn().mockResolvedValueOnce({
      status: 'rule-date-changed',
      date: '2026-03-11',
    });
    initServer({
      'exchange-rates/resolve': resolve,
      'transactions/post-foreign-entry': post,
    });
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        defaultCurrencyCode: 'USD',
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'USD',
          precision: 2,
        }),
      }),
    );
    render(
      <TestProviders store={store}>
        <MemoryRouter>
          <HotkeysProvider>
            <ForeignAmountModal
              transaction={draft}
              currencyCode="JPY"
              nativePrecision={0}
              onPosted={vi.fn()}
            />
          </HotkeysProvider>
        </MemoryRouter>
      </TestProviders>,
    );
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText(/A rule changed the date/);
    expect(screen.queryByText(/at 1 USD = 150 JPY/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    finish({ status: 'unavailable' });
    expect(
      await screen.findAllByText(
        'Rate unavailable. Enter a base amount or rate.',
      ),
    ).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('keeps working when a rate converts out of range', async () => {
    const { post } = setup({ ...standing, rate: '0.000000000001' });
    expect(
      await screen.findAllByText(
        'Rate unavailable. Enter a base amount or rate.',
      ),
    ).not.toHaveLength(0);
    await userEvent.type(await field('rate'), '0.000000000001');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Enter a valid base amount or rate.'),
    ).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('writes nothing when cancelled', async () => {
    const { post } = setup(standing);
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(post).not.toHaveBeenCalled();
  });

  it('prefills a one-day rate and posts that rate', async () => {
    const { post } = setup(
      {
        ...standing,
        kind: 'dated',
        timestamp: '2026-03-10T00:00:00.000Z',
      },
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    await waitFor(async () => {
      expect(await field('rate')).toHaveValue('150');
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({
          rate: '150',
          saveStanding: false,
          replaceRate: false,
        }),
      ),
    );
  });

  it('leaves the rate field empty for a standing or fetched rate', async () => {
    setup(standing);
    expect(await field('rate')).toHaveValue('');
  });

  it('can save the entered rate as a standing rate', async () => {
    const { post } = setup(
      { status: 'unavailable' },
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    await userEvent.type(await field('rate'), '125');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Use this rate from this date' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({ rate: '125', saveStanding: true }),
      ),
    );
  });
});
