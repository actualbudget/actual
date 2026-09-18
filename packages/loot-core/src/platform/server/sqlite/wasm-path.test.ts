import { describe, expect, it } from 'vitest';

import { getSqlWasmUrl } from './index';

describe('sql.js wasm URL', () => {
  it('resolves the wasm beside the app assets for an arbitrary base path', () => {
    expect(getSqlWasmUrl('/finances/')).toBe('/finances/sql-wasm.wasm');
    expect(getSqlWasmUrl('/cash+flow/')).toBe('/cash+flow/sql-wasm.wasm');
    expect(getSqlWasmUrl('/')).toBe('/sql-wasm.wasm');
  });
});
