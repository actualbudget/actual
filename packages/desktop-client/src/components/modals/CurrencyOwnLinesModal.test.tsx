import type { ChangeEvent } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryCurrencyEntity } from '@actual-app/core/types/models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pushModal } from '#modals/modalsSlice';

import { CurrencyOwnLinesModal } from './CurrencyOwnLinesModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let mockPrefs: Record<string, string> = {};
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [
      { id: 'chequing', closed: 0, offbudget: 0, currency: 'CAD' },
      { id: 'us', closed: 0, offbudget: 0, currency: 'USD' },
      { id: 'co', closed: 0, offbudget: 0, currency: 'COP' },
      { id: 'old', closed: 1, offbudget: 0, currency: 'GBP' },
    ],
  }),
}));

// A native select, so a test can pick an option
vi.mock('@actual-app/components/select', () => ({
  Select: ({
    value,
    options,
    onChange,
  }: {
    value: string;
    options: Array<readonly [unknown, string] | unknown>;
    onChange: (value: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    >
      {options
        .filter(
          (option): option is [string, string] =>
            Array.isArray(option) && typeof option[0] === 'string',
        )
        .map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
    </select>
  ),
}));

const currentMonth = monthUtils.currentMonth().replace('-', '');

function renderModal(
  earlierSpending: string[] = [],
  lines: CategoryCurrencyEntity[] = [],
) {
  const save = vi.fn(async () => undefined);
  initServer({
    'category-currencies-get': async () => lines,
    'category-currency-earlier-spending': async () => earlierSpending,
    'currency-own-lines-save': save,
    'load-prefs': async () => ({}),
    'load-global-prefs': async () => ({}),
    'preferences/get': async () => ({}),
  });
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  store.dispatch(pushModal({ modal: { name: 'currency-own-lines' } }));
  render(
    <TestProviders queryClient={queryClient} store={store}>
      <CurrencyOwnLinesModal />
    </TestProviders>,
  );
  return { save };
}

function chooseMode(mode: 'none' | 'all' | 'selected') {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: mode } });
}

describe('CurrencyOwnLinesModal', () => {
  beforeEach(() => {
    mockPrefs = {
      'flags.currency': 'true',
      'flags.multiCurrency': 'true',
      defaultCurrencyCode: 'CAD',
    };
  });

  it('budgets the chosen currency on its own in every month without earlier spending', async () => {
    const { save } = renderModal();

    chooseMode('selected');
    // Only currencies of open accounts other than the default are offered
    expect(screen.queryByRole('checkbox', { name: /^CAD/ })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /^GBP/ })).toBeNull();
    await userEvent.click(screen.getByRole('checkbox', { name: /^USD/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        value: 'USD:0',
        moveEarlier: [],
        dropCurrencies: [],
      }),
    );
  });

  it('asks whether earlier spending moves into the new lines', async () => {
    const { save } = renderModal(['COP', 'USD']);

    chooseMode('selected');
    await userEvent.click(screen.getByRole('checkbox', { name: /^USD/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    // COP isn't chosen, so its earlier spending stays put either way
    await screen.findByText(/Earlier months have spending in USD,/);
    expect(save).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Keep earlier months' }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        value: `USD:${currentMonth}`,
        moveEarlier: [],
        dropCurrencies: [],
      }),
    );
  });

  it('moves earlier spending into lines when the user wants to', async () => {
    const { save } = renderModal(['USD']);

    chooseMode('selected');
    await userEvent.click(screen.getByRole('checkbox', { name: /^USD/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Move it into lines too' }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        value: 'USD:0',
        moveEarlier: ['USD'],
        dropCurrencies: [],
      }),
    );
  });

  it('keeps the first month of currencies chosen before', async () => {
    mockPrefs['currency-own-lines'] = 'USD:202611';
    const { save } = renderModal(['USD']);

    chooseMode('all');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        value: 'USD:202611,*:0',
        moveEarlier: [],
        dropCurrencies: [],
      }),
    );
  });

  it('converts all spending again when no currency is chosen', async () => {
    mockPrefs['currency-own-lines'] = '*:0';
    const { save } = renderModal();

    chooseMode('none');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        value: '',
        moveEarlier: [],
        dropCurrencies: [],
      }),
    );
  });

  it('asks whether lines in currencies no longer chosen go away', async () => {
    mockPrefs['currency-own-lines'] = '*:0';
    const { save } = renderModal(
      [],
      [
        // Budgeted in, so stored
        {
          id: 'food-USD',
          category: 'food',
          currency: 'USD',
          start_month: null,
        },
        // Only there for its spending, so it goes away by itself
        {
          id: 'food-COP',
          category: 'food',
          currency: 'COP',
          start_month: null,
          automatic: true,
        },
      ],
    );

    chooseMode('none');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText(/Categories have lines in USD,/);
    expect(save).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Move into categories' }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        value: '',
        moveEarlier: [],
        dropCurrencies: ['USD'],
      }),
    );
  });

  it('keeps those lines when the user wants to', async () => {
    mockPrefs['currency-own-lines'] = 'USD:0';
    const { save } = renderModal(
      [],
      [
        {
          id: 'food-USD',
          category: 'food',
          currency: 'USD',
          start_month: null,
        },
      ],
    );

    chooseMode('none');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Keep the lines' }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        value: '',
        moveEarlier: [],
        dropCurrencies: [],
      }),
    );
  });

  it('leaves alone lines added in a currency that was not chosen', async () => {
    mockPrefs['currency-own-lines'] = 'USD:0';
    const { save } = renderModal(
      [],
      [
        {
          id: 'food-COP',
          category: 'food',
          currency: 'COP',
          start_month: null,
        },
      ],
    );

    chooseMode('none');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        value: '',
        moveEarlier: [],
        dropCurrencies: [],
      }),
    );
    expect(screen.queryByText(/Categories have lines in/)).toBeNull();
  });
});
