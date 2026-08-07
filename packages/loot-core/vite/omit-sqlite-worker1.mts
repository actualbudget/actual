import type { Plugin } from 'vite';

const SQLITE_WASM_MODULE_SUFFIX = '/@sqlite.org/sqlite-wasm/dist/index.mjs';
const WORKER_FACTORY =
  'return new Worker(new URL("sqlite3-worker1.mjs", import.meta.url), { type: "module" });';

/**
 * Actual uses SQLite's direct OO API in its own backend Worker. The package's
 * optional Worker1 promise API would otherwise make Vite emit a second,
 * unused copy of SQLite (roughly 1.4 MB).
 */
export function omitSqliteWorker1(): Plugin {
  return {
    name: 'omit-unused-sqlite-worker1',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replaceAll('\\', '/');
      if (!normalizedId.endsWith(SQLITE_WASM_MODULE_SUFFIX)) {
        return undefined;
      }
      if (!code.includes(WORKER_FACTORY)) {
        throw new Error(
          'The @sqlite.org/sqlite-wasm Worker1 factory changed; update the build transform before upgrading SQLite.',
        );
      }

      return {
        code: code.replace(
          WORKER_FACTORY,
          'throw new Error("SQLite Worker1 is not included in Actual.");',
        ),
        map: null,
      };
    },
  };
}
