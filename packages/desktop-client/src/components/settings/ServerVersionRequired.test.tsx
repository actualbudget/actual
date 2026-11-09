import { useEffect } from 'react';

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { useServerVersion } from '#components/ServerContext';
import { TestProviders } from '#mocks';

import { ServerVersionRequired } from './ServerVersionRequired';

vi.mock('#components/ServerContext', () => ({ useServerVersion: vi.fn() }));
const load = vi.fn();
function Panel() {
  useEffect(load, []);
  return <button>Panel control</button>;
}
function renderPanel() {
  return (
    <ServerVersionRequired title="API keys" minimumVersion="26.12.0">
      <Panel />
    </ServerVersionRequired>
  );
}
beforeEach(() => vi.clearAllMocks());

it.each(['v26.11.0', 'v26.2.0', '', 'N/A'])(
  'shows the requirement without mounting the panel for %j',
  version => {
    vi.mocked(useServerVersion).mockReturnValue(version);
    const { rerender } = render(renderPanel(), { wrapper: TestProviders });
    expect(
      screen.getByText('Requires server version 26.12.0 or newer.'),
    ).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
    vi.mocked(useServerVersion).mockReturnValue('v26.12.0');
    rerender(renderPanel());
    expect(screen.getByRole('button')).toBeVisible();
    expect(load).toHaveBeenCalledOnce();
  },
);
it.each(['v26.12.0+abc123', 'v27.1.0'])(
  'allows supported server version %s',
  version => {
    vi.mocked(useServerVersion).mockReturnValue(version);
    render(renderPanel(), { wrapper: TestProviders });
    expect(screen.getByRole('button')).toBeVisible();
  },
);
