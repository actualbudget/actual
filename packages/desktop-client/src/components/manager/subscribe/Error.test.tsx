import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Error as ErrorScreen } from './Error';

// Regression test for https://github.com/actualbudget/actual/issues/7026:
// with the app served from the service worker cache, "Try again" used to stay
// inside the cached app, so the browser could never ask to trust a self-signed
// certificate again.
function setup({
  error,
  isOnline,
  isServedFromCache,
}: {
  error: string;
  isOnline: boolean;
  isServedFromCache: boolean;
}) {
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  vi.stubGlobal('navigator', {
    onLine: isOnline,
    serviceWorker: { controller: isServedFromCache ? {} : null },
  });

  render(
    <MemoryRouter initialEntries={[{ pathname: '/error', state: { error } }]}>
      <ErrorScreen />
    </MemoryRouter>,
  );

  return { assign };
}

async function tryAgain() {
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
}

describe('Error screen "Try again"', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reloads from the server when the app is served from the cache', async () => {
    const { assign } = setup({
      error: 'network-failure',
      isOnline: true,
      isServedFromCache: true,
    });

    await tryAgain();

    expect(assign).toHaveBeenCalledWith('/?reload-from-server');
  });

  it.each([
    { error: 'network-failure', isOnline: false, isServedFromCache: true },
    { error: 'network-failure', isOnline: true, isServedFromCache: false },
    { error: 'parse-failure', isOnline: true, isServedFromCache: true },
  ])(
    'stays in the app for $error (online: $isOnline, cached: $isServedFromCache)',
    async options => {
      const { assign } = setup(options);

      await tryAgain();

      expect(assign).not.toHaveBeenCalled();
    },
  );
});
