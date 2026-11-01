import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExchangeFields } from '#components/mobile/transactions/ExchangeFields';
import type { ExchangeFieldsHandle } from '#components/mobile/transactions/ExchangeFields';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ExchangePanel } from './ExchangePanel';
import type { ExchangePostResult } from './ExchangePanel';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

function account(overrides: Partial<AccountEntity>): AccountEntity {
  return {
    id: 'usd',
    name: 'Checking',
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
    account_group_id: null,
    currency: null,
    currency_precision: null,
    ...overrides,
  };
}

const usd = account({});
const jpy = account({
  id: 'jpy',
  name: 'Yen wallet',
  currency: 'JPY',
  currency_precision: 0,
});

const payment = {
  id: 'temp',
  account: 'usd',
  date: '2026-03-10',
  amount: -10300,
  notes: 'trip',
  cleared: true,
} as TransactionEntity;

function setup(rate: string | null) {
  initServer({
    'exchange-rates/resolve': async () =>
      rate
        ? {
            status: 'resolved',
            rate,
            kind: 'standing',
            source: 'manual',
            timestamp: '2026-01-01T00:00:00.000Z',
            fallback: false,
          }
        : { status: 'unavailable' },
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
  return store;
}

describe('ExchangePanel', () => {
  it('posts the estimated amount and a fee from the register', async () => {
    const store = setup('150');
    const onPost = vi.fn(async (): Promise<ExchangePostResult> => ({
      status: 'ok',
    }));
    render(
      <TestProviders store={store}>
        <ExchangePanel
          transaction={payment}
          register={usd}
          other={jpy}
          onPost={onPost}
        />
      </TestProviders>,
    );
    await userEvent.type(screen.getByLabelText('Fee'), '3');
    // ($103.00 - $3.00) × 150 = ¥15,000, estimated from the saved rate.
    await waitFor(() =>
      expect(screen.getByLabelText('Amount received')).toHaveAttribute(
        'placeholder',
        '15,000',
      ),
    );
    expect(screen.getByText(/estimated from the saved rate 150/)).toBeTruthy();
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(onPost).toHaveBeenCalledWith({
      date: '2026-03-10',
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10300,
      destinationAmount: 15000,
      sourceFee: 300,
      feeCategory: null,
      notes: 'trip',
      cleared: true,
      initiatingAccount: 'usd',
    });
  });

  it('requires the other amount without a rate and shows handler errors', async () => {
    const store = setup(null);
    const onPost = vi.fn(async (): Promise<ExchangePostResult> => ({
      status: 'error',
      error: 'exchange-fee-invalid',
    }));
    render(
      <TestProviders store={store}>
        <ExchangePanel
          transaction={payment}
          register={usd}
          other={jpy}
          onPost={onPost}
        />
      </TestProviders>,
    );
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(
      screen.getByText('Enter the amount received in Yen wallet.'),
    ).toBeTruthy();
    expect(onPost).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Amount received'), '15000');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(
      await screen.findByText(
        'The fee must be smaller than the amount transferred.',
      ),
    ).toBeTruthy();
  });

  it('fills the other amount from a typed rate in the destination register', async () => {
    const store = setup(null);
    const onPost = vi.fn(async (): Promise<ExchangePostResult> => ({
      status: 'ok',
    }));
    render(
      <TestProviders store={store}>
        <ExchangePanel
          transaction={{ ...payment, amount: 15000 }}
          register={jpy}
          other={usd}
          onPost={onPost}
        />
      </TestProviders>,
    );
    expect(screen.getByText('Sent from Checking:')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Exchange rate'), '150');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(onPost).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAccount: 'usd',
        destinationAccount: 'jpy',
        sourceAmount: 10000,
        destinationAmount: 15000,
        initiatingAccount: 'jpy',
      }),
    );
  });
  it('keeps the budget precision inside a foreign register', async () => {
    const store = setup(null);
    const onPost = vi.fn(async (): Promise<ExchangePostResult> => ({
      status: 'ok',
    }));
    render(
      <TestProviders store={store}>
        <CurrencyFormatProvider currencyCode="JPY" precision={0}>
          <ExchangePanel
            transaction={{ ...payment, amount: 15000 }}
            register={jpy}
            other={usd}
            onPost={onPost}
          />
        </CurrencyFormatProvider>
      </TestProviders>,
    );
    await userEvent.type(screen.getByLabelText('Exchange rate'), '150');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(onPost).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAmount: 10000,
        destinationAmount: 15000,
      }),
    );
  });
});

describe('ExchangePanel inputs (inspection round 1)', () => {
  const kwd = account({
    id: 'kwd',
    name: 'Dinar cash',
    currency: 'KWD',
    currency_precision: 3,
  });
  const usdOff = account({ id: 'usdOff', name: 'Brokerage', offbudget: 1 });

  function renderPanel(
    props: Partial<Parameters<typeof ExchangePanel>[0]>,
    rate: string | null,
  ) {
    const store = setup(rate);
    const onPost = vi.fn(async (): Promise<ExchangePostResult> => ({
      status: 'ok',
    }));
    render(
      <TestProviders store={store}>
        <ExchangePanel
          transaction={payment}
          register={usd}
          other={jpy}
          onPost={onPost}
          {...props}
        />
      </TestProviders>,
    );
    return onPost;
  }

  it('posts once while a post is in flight', async () => {
    let resolve: (value: ExchangePostResult) => void = () => undefined;
    const onPost = vi.fn(
      () =>
        new Promise<ExchangePostResult>(r => {
          resolve = r;
        }),
    );
    const store = setup('150');
    render(
      <TestProviders store={store}>
        <ExchangePanel
          transaction={payment}
          register={usd}
          other={jpy}
          onPost={onPost}
        />
      </TestProviders>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Amount received')).toHaveAttribute(
        'placeholder',
      ),
    );
    const input = screen.getByLabelText('Amount received');
    await userEvent.type(input, '{Enter}{Enter}');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(onPost).toHaveBeenCalledTimes(1);
    resolve({ status: 'ok' });
  });

  it('rejects invalid text instead of using the saved rate', async () => {
    const onPost = renderPanel({}, '150');
    await userEvent.type(screen.getByLabelText('Exchange rate'), '0');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(screen.getByText('Enter a valid rate.')).toBeTruthy();
    await userEvent.clear(screen.getByLabelText('Exchange rate'));
    await userEvent.type(screen.getByLabelText('Fee'), 'abc');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(screen.getByText('Enter a valid fee.')).toBeTruthy();
    expect(onPost).not.toHaveBeenCalled();
  });

  it('starts the principal category from the draft', async () => {
    const onPost = renderPanel(
      {
        transaction: { ...payment, amount: -10000, category: 'saving' },
        other: usdOff,
      },
      null,
    );
    await userEvent.type(screen.getByLabelText('Amount received'), '100');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(onPost).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'saving' }),
    );
  });

  it('asks for the category only where the row has none', async () => {
    renderPanel({ other: usdOff }, null);
    // The on-budget register row's own category control is the only one;
    // the panel's selector shows "None" when present.
    expect(screen.queryByText('None')).toBeNull();
  });

  it('posts the panel category from an off-budget register', async () => {
    const onPost = renderPanel(
      {
        transaction: { ...payment, amount: 10000 },
        register: usdOff,
        other: usd,
      },
      null,
    );
    expect(screen.getByText('None')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Amount sent'), '100');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(onPost).toHaveBeenCalledWith(
      expect.objectContaining({ category: null }),
    );
  });

  it('follows a category rules set after the panel opens', async () => {
    const store = setup(null);
    const onPost = vi.fn(async (): Promise<ExchangePostResult> => ({
      status: 'ok',
    }));
    const panel = (category?: string) => (
      <TestProviders store={store}>
        <ExchangePanel
          transaction={{ ...payment, amount: 10000, category }}
          register={usdOff}
          other={usd}
          onPost={onPost}
        />
      </TestProviders>
    );
    const { rerender } = render(panel());
    rerender(panel('saving'));
    await userEvent.type(screen.getByLabelText('Amount sent'), '100');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(onPost).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'saving' }),
    );
  });

  it('estimates and posts the budget value between two foreign accounts', async () => {
    const onPost = renderPanel(
      {
        transaction: { ...payment, amount: -15000 },
        register: jpy,
        other: kwd,
      },
      '150',
    );
    await userEvent.type(screen.getByLabelText('Amount received'), '30.75');
    // ¥15,000 at 150 yen per dollar: $100.00.
    await waitFor(() =>
      expect(screen.getByLabelText('Value in budget currency')).toHaveAttribute(
        'placeholder',
        '100.00',
      ),
    );
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(onPost).toHaveBeenCalledWith(
      expect.objectContaining({ baseAmount: 10000, destinationAmount: 30750 }),
    );
  });

  it('requires the budget value when no rate resolves', async () => {
    const onPost = renderPanel(
      {
        transaction: { ...payment, amount: -15000 },
        register: jpy,
        other: kwd,
      },
      null,
    );
    await userEvent.type(screen.getByLabelText('Amount received'), '30.75');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    expect(screen.getByText('Enter the value in USD.')).toBeTruthy();
    expect(onPost).not.toHaveBeenCalled();
  });
});

describe('ExchangeFields (mobile)', () => {
  it('posts through the same request when the form saves', async () => {
    const store = setup('150');
    const onPost = vi.fn(async (): Promise<ExchangePostResult> => ({
      status: 'ok',
    }));
    const ref: { current: ExchangeFieldsHandle | null } = { current: null };
    render(
      <TestProviders store={store}>
        <ExchangeFields
          ref={ref}
          transaction={{ ...payment, amount: -10000 }}
          register={usd}
          other={jpy}
          onPost={onPost}
        />
      </TestProviders>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Amount received')).toHaveAttribute(
        'placeholder',
        '15,000',
      ),
    );
    await expect(ref.current?.post()).resolves.toBe(true);
    expect(onPost).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAmount: 10000,
        destinationAmount: 15000,
      }),
    );
  });
});
