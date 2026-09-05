import 'fake-indexeddb/auto';
import { init } from './index';

const initState = vi.hoisted<{
  apiConfig: unknown;
}>(() => ({ apiConfig: undefined }));

vi.mock('#platform/server/sqlite/sqlite-module', () => ({
  loadSqliteInitModule: vi.fn(async () => async () => {
    initState.apiConfig = (
      globalThis as typeof globalThis & { sqlite3ApiConfig?: unknown }
    ).sqlite3ApiConfig;
    return {};
  }),
}));

it('disables SAB-dependent OPFS VFSes during SQLite bootstrap', async () => {
  await init();

  expect(initState.apiConfig).toMatchObject({
    disable: {
      vfs: {
        opfs: true,
        'opfs-wl': true,
      },
    },
  });
  expect(
    (
      globalThis as typeof globalThis & {
        sqlite3ApiConfig?: unknown;
      }
    ).sqlite3ApiConfig,
  ).toBeUndefined();
});
