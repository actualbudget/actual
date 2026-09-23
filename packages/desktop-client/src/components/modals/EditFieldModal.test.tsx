import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { EditFieldModal } from './EditFieldModal';

vi.mock('#components/common/Modal', () => ({
  Modal: ({
    children,
  }: {
    children: (state: { state: { close: () => void } }) => ReactNode;
  }) => children({ state: { close: vi.fn() } }),
  ModalHeader: () => null,
  ModalCloseButton: () => null,
}));

it.each([
  [0, '1234', 1234],
  [2, '12.34', 1234],
  [3, '1.234', 1234],
] as const)('submits an amount at %idp', async (precision, input, amount) => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'KWD',
        precision,
      }),
    }),
  );
  const onSubmit = vi.fn();
  render(
    <TestProviders store={store}>
      <EditFieldModal name="amount" onSubmit={onSubmit} />
    </TestProviders>,
  );
  await userEvent.type(screen.getByRole('textbox'), `${input}{enter}`);
  expect(onSubmit).toHaveBeenCalledWith('amount', amount);
});

it('does not submit malformed amount text', async () => {
  const onSubmit = vi.fn();
  render(
    <TestProviders>
      <EditFieldModal name="amount" onSubmit={onSubmit} />
    </TestProviders>,
  );
  await userEvent.type(screen.getByRole('textbox'), 'bad{enter}');
  expect(onSubmit).not.toHaveBeenCalled();
});
