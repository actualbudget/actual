import { render, screen } from '@testing-library/react';

import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ExperimentalFeatures } from './Experimental';

vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));

function renderExperimental(defaultCurrencyCode: string) {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({ 'flags.currency': 'true', defaultCurrencyCode }),
  );
  render(
    <TestProviders store={store}>
      <ExperimentalFeatures />
    </TestProviders>,
  );
}

describe('Multiple currencies toggle', () => {
  beforeEach(() => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
  });

  it('needs a budget currency before it can be turned on', () => {
    renderExperimental('');
    expect(
      screen.getByRole('checkbox', { name: 'Multiple currencies' }),
    ).toBeDisabled();
    expect(screen.getByText(/Choose a default currency/)).toBeVisible();
  });

  it('can be turned on once a budget currency is set', () => {
    renderExperimental('USD');
    expect(
      screen.getByRole('checkbox', { name: 'Multiple currencies' }),
    ).toBeEnabled();
    expect(screen.queryByText(/Choose a default currency/)).toBeNull();
  });
});
