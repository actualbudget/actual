import { load } from 'migrate';
import { describe, expect, it, vi } from 'vitest';

import { run } from './migrations';

vi.mock('migrate', () => ({ load: vi.fn() }));
vi.mock('./load-config', () => ({
  config: {
    get: vi.fn(key => (key === 'dataDir' ? '.' : 'test')),
  },
}));

describe('migrations', () => {
  it('preserves the legacy JavaScript title for a TypeScript migration', async () => {
    let migrationNames;

    vi.mocked(load).mockImplementation((options, callback) => {
      migrationNames = Object.keys(options.migrations);
      callback(null, {
        up: next => next(),
      });
    });

    await run();

    expect(migrationNames).toContain('1694360000000-create-folders.js');
    expect(migrationNames).not.toContain('1694360000000-create-folders.ts');
  });
});
