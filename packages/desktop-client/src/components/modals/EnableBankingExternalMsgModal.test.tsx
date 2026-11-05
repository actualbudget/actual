import { sendCatch } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { EnableBankingExternalMsgModal } from './EnableBankingExternalMsgModal';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  sendCatch: vi.fn(),
}));

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: () => [null],
}));

vi.mock('#hooks/useEnableBankingStatus', () => ({
  useEnableBankingStatus: () => ({
    configuredEnableBanking: true,
    isLoading: false,
  }),
}));

vi.mock('#components/util/localeToCountry', () => ({
  getCountryFromBrowser: () => 'DE',
}));

it('shows the reason when Enable Banking refuses to list banks', async () => {
  vi.mocked(sendCatch).mockResolvedValue({
    data: { error: 'Application is not active' },
    error: undefined,
  });

  render(
    <TestProviders>
      <EnableBankingExternalMsgModal
        onMoveExternal={vi.fn()}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    </TestProviders>,
  );

  expect(
    await screen.findByText('Details: Application is not active'),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Choose your bank:')).not.toBeInTheDocument();
});

it('shows the reason when the request for the bank list fails', async () => {
  vi.mocked(sendCatch).mockResolvedValue({
    data: undefined,
    error: { type: 'ServerError', message: 'network-failure' },
  });

  render(
    <TestProviders>
      <EnableBankingExternalMsgModal
        onMoveExternal={vi.fn()}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    </TestProviders>,
  );

  expect(
    await screen.findByText('Details: network-failure'),
  ).toBeInTheDocument();
});
