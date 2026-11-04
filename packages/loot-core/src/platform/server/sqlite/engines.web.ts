import { wasmEngine } from './engine.wasm';

import { registerEngine } from './index';

// The web worker entry registers the sqlite-wasm engine so the storage
// flag can select it. Native builds resolve `#platform/server/sqlite/engines`
// to `engines.native.ts`, which has nothing to register.
export function registerSqliteEngines() {
  registerEngine('wasm', wasmEngine);
}
