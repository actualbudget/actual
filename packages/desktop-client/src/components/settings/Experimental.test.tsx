import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';
import type * as Redux from '#redux';

import { ExperimentalFeatures } from './Experimental';

const state = vi.hoisted(() => ({
  precision: false,
  dispatch: vi.fn(),
  setFlag: vi.fn(),
}));

vi.mock('#hooks/useFeatureFlag', () => ({
  useFeatureFlag: (flag: string) =>
    flag === 'currency' || (flag === 'currencyPrecision' && state.precision),
}));
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (key: string) => [
    key === 'defaultCurrencyCode' ? 'JPY' : undefined,
    state.setFlag,
  ],
}));
vi.mock('#hooks/useMetadataPref', () => ({
  useMetadataPref: () => [undefined],
}));
vi.mock('#redux', async importOriginal => ({
  ...(await importOriginal<typeof Redux>()),
  useDispatch: () => state.dispatch,
}));
vi.mock('#auth/AuthProvider', () => ({
  useAuth: () => ({ hasPermission: () => false }),
}));
vi.mock('#hooks/useServerPref', () => ({ useServerPref: () => [undefined] }));
vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: () => 'no-server',
}));

it.each([false, true])(
  'uses the protected precision transition when enabled is %s',
  async enabled => {
    state.precision = enabled;
    state.dispatch.mockClear();
    state.setFlag.mockClear();
    render(
      <TestProviders>
        <MemoryRouter>
          <ExperimentalFeatures />
        </MemoryRouter>
      </TestProviders>,
    );
    await userEvent.click(
      screen.getByRole('checkbox', {
        name: /Per-currency decimal precision/,
      }),
    );
    expect(state.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          modal: {
            name: 'amount-encoding',
            options: { enabled: !enabled, currencyCode: 'JPY' },
          },
        },
      }),
    );
    expect(state.setFlag).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('checkbox', { name: /Mobile calculator/ }),
    );
    expect(state.setFlag).toHaveBeenCalledWith('true');
  },
);
