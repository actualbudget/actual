import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import { currentDay } from '@actual-app/core/shared/months';
import type { ExchangeRateEntity } from '@actual-app/core/types/models';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ExchangeRates } from './ExchangeRates';

const rates: ExchangeRateEntity[] = [
  {
    id: 'rate',
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: 1.4,
    date: '2026-10-01',
    source: 'manual',
    created_at: null,
  },
];

vi.mock('#hooks/useExchangeRates', () => ({
  useExchangeRates: () => ({
    exchangeRates: rates,
    rateIndex: buildRateIndex(rates),
  }),
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [] }),
}));

function renderPage() {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      'flags.currency': 'true',
      'flags.multiCurrency': 'true',
      defaultCurrencyCode: 'CAD',
      dateFormat: 'dd.MM.yyyy',
    }),
  );
  render(
    <TestProviders store={store}>
      <ExchangeRates />
    </TestProviders>,
  );
}

describe('ExchangeRates', () => {
  it('shows the content of each tab in a panel labelled by it', () => {
    renderPage();

    const panels = screen.getAllByRole('tabpanel');
    expect(panels).toHaveLength(2);

    const ratesTab = screen.getByRole('tab', { name: 'Rates' });
    expect(panels[0]).toHaveAttribute('aria-labelledby', ratesTab.id);

    const pairTab = screen.getByRole('tab', { name: 'USD → CAD' });
    expect(panels[1]).toHaveAttribute('aria-labelledby', pairTab.id);
    expect(within(panels[1]).getByText('Add a rate')).toBeInTheDocument();
  });

  it('enters the date of a rate in the date format', () => {
    renderPage();

    expect(screen.getByLabelText('Date')).toHaveValue(
      format(parseISO(currentDay()), 'dd.MM.yyyy'),
    );
  });

  it('explains the number format of imported rates', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('tab', { name: 'Import and export' }),
    );

    expect(
      within(screen.getByRole('tabpanel')).getByText(
        /Rates use a dot as the decimal mark, or a comma when values are separated by semicolons or tabs, and no thousands separators/,
      ),
    ).toBeInTheDocument();
  });
});
