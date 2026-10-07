import { HotkeysProvider } from 'react-hotkeys-hook';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';
import { pushModal } from '#modals/modalsSlice';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import type { ForeignAmountEdit } from '#util/foreign-edit';

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

function setup(
  resolution: Resolution | (() => Promise<Resolution>),
  post = vi.fn(),
  transaction: typeof draft & { payee_name?: string } = draft,
) {
  initServer({
    'budget/edit-effects': async () => [],
    'exchange-rates/resolve':
      typeof resolution === 'function' ? resolution : async () => resolution,
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
            transaction={transaction}
            currencyCode="JPY"
            nativePrecision={0}
            onPosted={onPosted}
          />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { post, onPosted, store };
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
      'budget/edit-effects': async () => [],
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
      'budget/edit-effects': async () => [],
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

  it('cannot be cancelled or dismissed while posting', async () => {
    let finish: (value: { status: 'ok'; id: string }) => void = () => undefined;
    const { onPosted } = setup(
      standing,
      vi.fn(() => new Promise(done => (finish = done))),
    );
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    finish({ status: 'ok', id: 'draft' });
    await waitFor(() => expect(onPosted).toHaveBeenCalled());
  });

  it('closes only itself, keeping a modal opened above it', async () => {
    const { store } = setup(
      standing,
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    store.dispatch(
      pushModal({
        modal: {
          name: 'foreign-amount',
          options: {
            transaction: draft,
            currencyCode: 'JPY',
            nativePrecision: 0,
            onPosted: vi.fn(),
          },
        },
      }),
    );
    store.dispatch(pushModal({ modal: { name: 'goal-templates' } }));
    await screen.findByText(/at 1 USD = 150 JPY/);
    // The dialog below the top modal is inactive; skip the pointer check.
    await userEvent
      .setup({ pointerEventsCheck: 0 })
      .click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(store.getState().modals.modalStack.map(m => m.name)).toEqual([
        'goal-templates',
      ]),
    );
  });

  it('explains a refused posting and stays open', async () => {
    setup(
      standing,
      vi.fn(async () => {
        throw new Error('multicurrency-transfer-unavailable');
      }),
    );
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('This transaction could not be saved.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('writes nothing when cancelled', async () => {
    const { post } = setup(standing);
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(post).not.toHaveBeenCalled();
  });

  it('prefills a one-day rate and posts its reviewed base as the default', async () => {
    const dated = {
      ...standing,
      kind: 'dated',
      timestamp: '2026-03-10T00:00:00.000Z',
    } as const;
    // The one-day rate is deleted elsewhere after the dialog resolved it.
    let current: Resolution = dated;
    const { post } = setup(
      async () => current,
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    await waitFor(async () => {
      expect(await field('rate')).toHaveValue('150');
    });
    expect(screen.getByText(/at 1 USD = 150 JPY/)).toHaveTextContent(
      /\(dated, manual, 2026-03-10\)/,
    );
    expect(screen.queryByText(/at the entered rate/)).toBeNull();
    current = { status: 'unavailable' };
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    // No rate is sent, so the deleted one-day rate is not recreated.
    expect(post.mock.calls[0][0]).toMatchObject({
      baseAmount: -1000,
      saveStanding: false,
      replaceRate: false,
    });
    expect(post.mock.calls[0][0]).not.toHaveProperty('rate');
  });

  it('saves a resolved default rate as standing when asked', async () => {
    const { post } = setup(
      standing,
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Use this rate from this date' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({
          baseAmount: -1000,
          rate: '150',
          expectedBaseAmount: -1000,
          saveStanding: true,
        }),
      ),
    );
  });

  it('saves the fetched default as standing for a starting balance', async () => {
    const { post } = setup(
      { ...standing, kind: 'fetched', source: 'provider' },
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
      { ...draft, payee_name: 'Starting Balance' },
    );
    await screen.findByText(/at 1 USD = 150 JPY/);
    expect(
      screen.getByRole('checkbox', { name: 'Use this rate from this date' }),
    ).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({
          baseAmount: -1000,
          rate: '150',
          saveStanding: true,
        }),
      ),
    );
  });

  it('offers no standing rate when there is no rate to save', async () => {
    setup({ status: 'unavailable' });
    await screen.findAllByText(
      'Rate unavailable. Enter a base amount or rate.',
    );
    const checkbox = screen.getByRole('checkbox', {
      name: 'Use this rate from this date',
    });
    expect(checkbox).toBeDisabled();
    await userEvent.type(await field('baseAmount'), '12.34');
    expect(checkbox).toBeDisabled();
    await userEvent.type(await field('rate'), '125');
    expect(checkbox).toBeEnabled();
  });

  it('recovers when the rate lookup fails', async () => {
    const { post } = setup(
      async () => {
        throw new Error('rate-lookup-failed');
      },
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    expect(
      await screen.findByText(
        'The rate could not be loaded. Enter a base amount or rate.',
      ),
    ).toBeInTheDocument();
    await userEvent.type(await field('baseAmount'), '12.34');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({ baseAmount: -1234 }),
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
  it('saves a rate typed beside a base amount', async () => {
    const { post } = setup(
      { status: 'unavailable' },
      vi.fn(async () => ({ status: 'ok', id: 'draft' })),
    );
    await userEvent.type(await field('baseAmount'), '12.34');
    await userEvent.type(await field('rate'), '125');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Use this rate from this date' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({
          baseAmount: -1234,
          rate: '125',
          expectedBaseAmount: -1234,
          saveStanding: true,
        }),
      ),
    );
  });

  it('drops a prefilled rate as soon as a rule changes the date', async () => {
    const dated = {
      ...standing,
      kind: 'dated',
      timestamp: '2026-03-10T00:00:00.000Z',
    } as const;
    // The new date's lookup never answers.
    const resolve = vi.fn(({ date }: { date: string }) =>
      date === '2026-03-10'
        ? Promise.resolve(dated)
        : new Promise<typeof dated>(() => undefined),
    );
    const post = vi
      .fn()
      .mockResolvedValue({ status: 'rule-date-changed', date: '2026-03-11' });
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
    await waitFor(async () => expect(await field('rate')).toHaveValue('150'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText(/A rule changed the date to 2026-03-11/);
    expect(await field('rate')).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('ForeignAmountModal editing an existing row', () => {
  const snapshot = {
    account: 'jpy',
    amount: -1000,
    transaction_amount: -1500,
    date: '2026-03-10',
    category: null,
    reconciled: false,
  };

  function setupEdit(
    edit: ForeignAmountEdit,
    handlers: Record<string, ReturnType<typeof vi.fn>> = {},
    native = -2000,
  ) {
    const update = vi.fn().mockResolvedValue({ status: 'ok' });
    initServer({
      'budget/edit-effects': async () => [],
      'exchange-rates/resolve': async () => standing,
      'transactions/update-foreign-entry': update,
      'transactions/update-foreign-transfer': update,
      ...handlers,
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
              transaction={{ ...draft, id: 't', transaction_amount: native }}
              currencyCode="JPY"
              nativePrecision={0}
              edit={edit}
              onPosted={onPosted}
            />
          </HotkeysProvider>
        </MemoryRouter>
      </TestProviders>,
    );
    return { update, onPosted, store };
  }

  it('saves a changed native amount at the saved rate with the snapshot', async () => {
    const { update, onPosted } = setupEdit({
      kind: 'entry',
      id: 't',
      expected: snapshot,
      reconciled: false,
    });
    expect(await field('nativeAmount')).toHaveValue('-2,000');
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        id: 't',
        expected: snapshot,
        transaction_amount: -2000,
        baseAmount: -1333,
        replaceRate: false,
        saveStanding: false,
      }),
    );
    expect(onPosted).toHaveBeenCalled();
  });

  it('starts a valuation edit from the typed base and keeps the native amount', async () => {
    const { update } = setupEdit(
      {
        kind: 'entry',
        id: 't',
        expected: snapshot,
        reconciled: false,
        baseAmount: -1234,
      },
      {},
      -1500,
    );
    expect(await field('baseAmount')).toHaveValue('12.34');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_amount: -1500,
          baseAmount: -1234,
        }),
      ),
    );
  });

  it('saves nothing when nothing changed', async () => {
    const { update } = setupEdit(
      { kind: 'entry', id: 't', expected: snapshot, reconciled: false },
      {},
      -1500,
    );
    expect(await screen.findByText(/unchanged/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps the stored pair when a prefilled one-day rate is left alone', async () => {
    const { update } = setupEdit(
      { kind: 'entry', id: 't', expected: snapshot, reconciled: false },
      {
        'exchange-rates/resolve': vi.fn(async () => ({
          ...standing,
          kind: 'dated',
          timestamp: '2026-03-10T00:00:00.000Z',
        })),
      },
      -1500,
    );
    await waitFor(async () => expect(await field('rate')).toHaveValue('150'));
    expect(screen.getByText(/unchanged/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(update).not.toHaveBeenCalled();
  });

  it('edits both legs of a same-currency transfer', async () => {
    const counterpart = { ...snapshot, account: 'jpy2', amount: 1000 };
    const { update } = setupEdit({
      kind: 'transfer',
      id: 't',
      expected: { leg: snapshot, counterpart },
      reconciled: false,
    });
    expect(
      await screen.findByText(
        'The other account of this transfer changes to match.',
      ),
    ).toBeInTheDocument();
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          expected: { leg: snapshot, counterpart },
          transaction_amount: -2000,
        }),
      ),
    );
  });

  it('uses the linked-transfer warning when only the other leg is reconciled', async () => {
    const counterpart = {
      ...snapshot,
      account: 'jpy2',
      amount: 1000,
      reconciled: true,
    };
    const { update, store } = setupEdit({
      kind: 'transfer',
      id: 't',
      expected: { leg: snapshot, counterpart },
      reconciled: true,
    });
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const confirm = await waitFor(() => {
      const modal = store
        .getState()
        .modals.modalStack.find(m => m.name === 'confirm-transaction-edit');
      assert(modal);
      return modal;
    });
    assert(confirm.name === 'confirm-transaction-edit');
    expect(confirm.options.confirmReason).toBe(
      'batchEditWithReconciledTransfer',
    );
    confirm.options.onConfirm();
    await waitFor(() => expect(update).toHaveBeenCalled());
  });

  it('keeps a stale edit open and unsaveable', async () => {
    const stale = vi.fn().mockResolvedValue({ status: 'stale' });
    setupEdit(
      { kind: 'entry', id: 't', expected: snapshot, reconciled: false },
      { 'transactions/update-foreign-entry': stale },
    );
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(/changed since you opened it/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('asks before changing a reconciled row and saves nothing when cancelled', async () => {
    const { update, store } = setupEdit({
      kind: 'entry',
      id: 't',
      expected: snapshot,
      reconciled: true,
    });
    await screen.findByText(/at 1 USD = 150 JPY/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const confirm = await waitFor(() => {
      const modal = store
        .getState()
        .modals.modalStack.find(m => m.name === 'confirm-transaction-edit');
      assert(modal);
      return modal;
    });
    assert(confirm.name === 'confirm-transaction-edit');
    confirm.options.onCancel?.();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(update).not.toHaveBeenCalled();
  });
});
