import { useEffect, useState } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { send } from 'loot-core/platform/client/fetch';

import { useBunqStatus } from './useBunqStatus';

import { useSyncServerStatus } from './useSyncServerStatus';

vi.mock('loot-core/platform/client/fetch', () => ({
  send: vi.fn(),
}));

vi.mock('@desktop-client/hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));

function TestComponent() {
  const { configuredBunq, isLoading } = useBunqStatus();
  const [state, setState] = useState('idle');

  useEffect(() => {
    setState(`${configuredBunq ?? 'null'}:${isLoading ? 'loading' : 'idle'}`);
  }, [configuredBunq, isLoading]);

  return <div>{state}</div>;
}

describe('useBunqStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches bunq status when sync server is online', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(send).mockResolvedValue({ configured: true });

    render(<TestComponent />);

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith('bunq-status');
      expect(screen.getByText('true:idle')).toBeInTheDocument();
    });
  });

  it('does not fetch bunq status when sync server is offline', () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('offline');

    render(<TestComponent />);

    expect(send).not.toHaveBeenCalled();
  });

  it('falls back to unconfigured when bunq status endpoint is unavailable', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(send).mockRejectedValue(new Error('Cannot POST /bunq/status'));

    render(<TestComponent />);

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith('bunq-status');
      expect(screen.getByText('false:idle')).toBeInTheDocument();
    });
  });
});
