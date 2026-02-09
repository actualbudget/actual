import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { send } from 'loot-core/platform/client/fetch';

import { BunqInitialiseModal } from './BunqInitialiseModal';

import { TestProvider } from '@desktop-client/redux/mock';

vi.mock('loot-core/platform/client/fetch', () => ({
  send: vi.fn(),
}));

describe('BunqInitialiseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(send).mockResolvedValue({});
  });

  it('shows permitted IPs field with wildcard default and required security copy', () => {
    render(
      <TestProvider>
        <BunqInitialiseModal onSuccess={vi.fn()} />
      </TestProvider>,
    );

    const permittedIpsInput = screen.getByLabelText('Permitted IPs:');
    expect(permittedIpsInput).toHaveValue('*');

    expect(
      screen.getByText(
        'Guard your API key carefully, as it provides access to sensitive financial information similar to actual banking details. Make sure not to commit it to your source control. If you end up doing so you can always revoke the key from your bunq app.',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Use * to allow any IP address (less secure). For improved security, provide a comma-separated list of trusted IP addresses.',
      ),
    ).toBeInTheDocument();
  });

  it('saves API key and permitted IPs when submitting', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(
      <TestProvider>
        <BunqInitialiseModal onSuccess={onSuccess} />
      </TestProvider>,
    );

    await user.type(screen.getByLabelText('API Key:'), 'bunq-api-key-1');

    const permittedIpsInput = screen.getByLabelText('Permitted IPs:');
    await user.clear(permittedIpsInput);
    await user.type(permittedIpsInput, '203.0.113.10, 198.51.100.1');

    await user.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(send).toHaveBeenNthCalledWith(1, 'secret-set', {
      name: 'bunq_apiKey',
      value: 'bunq-api-key-1',
    });
    expect(send).toHaveBeenNthCalledWith(2, 'secret-set', {
      name: 'bunq_permittedIps',
      value: '203.0.113.10, 198.51.100.1',
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
