import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { config as loadedConfig } from './load-config';

// load-config reads the environment when it is first imported, so the
// environment has to be set up before importing it.
describe('load-config _FILE overrides', () => {
  let secretDirectory: string;
  let config: typeof loadedConfig;

  beforeAll(async () => {
    secretDirectory = mkdtempSync(join(tmpdir(), 'actual-load-config-'));

    const secretPath = join(secretDirectory, 'client-secret');
    writeFileSync(secretPath, 'secret-from-file\n');

    process.env.ACTUAL_OPENID_CLIENT_SECRET_FILE = secretPath;
    // Also set the plain variable, which convict imports at construction time
    // and re-imports at the end of loadFile. The file must still win.
    process.env.ACTUAL_OPENID_CLIENT_SECRET = 'secret-from-env';

    ({ config } = await import('./load-config'));
  });

  afterAll(() => {
    delete process.env.ACTUAL_OPENID_CLIENT_SECRET_FILE;
    delete process.env.ACTUAL_OPENID_CLIENT_SECRET;
    rmSync(secretDirectory, { recursive: true, force: true });
  });

  it('loads the secret from the file, superseding the plain variable', () => {
    expect(config.get('openId.client_secret')).toBe('secret-from-file');
  });
});
