import type { GlobalPrefs } from '@actual-app/core/types/prefs';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

async function setup() {
  vi.resetModules();
  const { initServer } =
    await import('@actual-app/core/platform/client/connection');
  const { configureTestAppStore, createTestQueryClient } =
    await import('#mocks');
  const { loadGlobalPrefs, loadPrefs, saveGlobalPrefs } =
    await import('./prefsSlice');

  let storedGlobalPrefs: GlobalPrefs = {};
  let globalLoads = 0;
  let releaseFirstLoad: (() => void) | undefined;

  initServer({
    'load-prefs': async () => ({}),
    'preferences/get': async () => ({}),
    'save-global-prefs': async prefs => {
      storedGlobalPrefs = { ...storedGlobalPrefs, ...prefs };
      return 'ok';
    },
    'load-global-prefs': async () => {
      const snapshot = storedGlobalPrefs;
      globalLoads++;
      if (globalLoads === 1) {
        await new Promise<void>(resolve => {
          releaseFirstLoad = resolve;
        });
      }
      return snapshot;
    },
  });

  return {
    store: configureTestAppStore({ queryClient: createTestQueryClient() }),
    loadGlobalPrefs,
    loadPrefs,
    saveGlobalPrefs,
    waitForFirstLoad: () => vi.waitFor(() => expect(globalLoads).toBe(1)),
    releaseFirstLoad: () => releaseFirstLoad?.(),
  };
}

describe('prefsSlice', () => {
  it('keeps a global pref saved while loadGlobalPrefs is in flight', async () => {
    const { store, loadGlobalPrefs, saveGlobalPrefs, ...server } =
      await setup();

    const loading = store.dispatch(loadGlobalPrefs());
    await server.waitForFirstLoad();
    await store.dispatch(saveGlobalPrefs({ prefs: { theme: 'light' } }));
    server.releaseFirstLoad();
    await loading;

    expect(store.getState().prefs.global.theme).toBe('light');
  });

  it('keeps a global pref saved while loadPrefs is in flight', async () => {
    const { store, loadPrefs, saveGlobalPrefs, ...server } = await setup();

    const loading = store.dispatch(loadPrefs());
    await server.waitForFirstLoad();
    await store.dispatch(saveGlobalPrefs({ prefs: { theme: 'light' } }));
    server.releaseFirstLoad();
    await loading;

    expect(store.getState().prefs.global.theme).toBe('light');
  });
});
