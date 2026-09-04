import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';

import { resolveConfig } from './config';

const mockSearch = vi.fn().mockResolvedValue(null);

vi.mock('cosmiconfig', () => ({
  cosmiconfig: () => ({
    search: (...args: unknown[]) => mockSearch(...args),
  }),
}));

function mockConfigFile(config: Record<string, unknown> | null) {
  if (config) {
    mockSearch.mockResolvedValue({ config, isEmpty: false });
  } else {
    mockSearch.mockResolvedValue(null);
  }
}

describe('resolveConfig', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const baseEnvKeys = [
    'ACTUAL_SERVER_URL',
    'ACTUAL_PASSWORD',
    'ACTUAL_SESSION_TOKEN',
    'ACTUAL_SYNC_ID',
    'ACTUAL_DATA_DIR',
    'ACTUAL_ENCRYPTION_PASSWORD',
    'ACTUAL_CACHE_TTL',
    'ACTUAL_LOCK_TIMEOUT',
    'ACTUAL_NO_LOCK',
  ];
  const envKeys = [...baseEnvKeys, ...baseEnvKeys.map(key => `${key}_FILE`)];

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    mockConfigFile(null);
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  describe('priority chain', () => {
    it('CLI opts take highest priority', async () => {
      process.env.ACTUAL_SERVER_URL = 'http://env';
      process.env.ACTUAL_PASSWORD = 'envpw';
      process.env.ACTUAL_ENCRYPTION_PASSWORD = 'env-enc';
      mockConfigFile({
        serverUrl: 'http://file',
        password: 'filepw',
        encryptionPassword: 'file-enc',
      });

      const config = await resolveConfig({
        serverUrl: 'http://cli',
        password: 'clipw',
        encryptionPassword: 'cli-enc',
      });

      expect(config.serverUrl).toBe('http://cli');
      expect(config.password).toBe('clipw');
      expect(config.encryptionPassword).toBe('cli-enc');
    });

    it('env vars override file config', async () => {
      process.env.ACTUAL_SERVER_URL = 'http://env';
      process.env.ACTUAL_PASSWORD = 'envpw';
      process.env.ACTUAL_ENCRYPTION_PASSWORD = 'env-enc';
      mockConfigFile({
        serverUrl: 'http://file',
        password: 'filepw',
        encryptionPassword: 'file-enc',
      });

      const config = await resolveConfig({});

      expect(config.serverUrl).toBe('http://env');
      expect(config.password).toBe('envpw');
      expect(config.encryptionPassword).toBe('env-enc');
    });

    it('file config is used when no CLI opts or env vars', async () => {
      mockConfigFile({
        serverUrl: 'http://file',
        password: 'filepw',
        syncId: 'budget-1',
        encryptionPassword: 'file-enc',
      });

      const config = await resolveConfig({});

      expect(config.serverUrl).toBe('http://file');
      expect(config.password).toBe('filepw');
      expect(config.syncId).toBe('budget-1');
      expect(config.encryptionPassword).toBe('file-enc');
    });
  });

  describe('defaults', () => {
    it('dataDir defaults to ~/.actual-cli/data', async () => {
      const config = await resolveConfig({
        serverUrl: 'http://test',
        password: 'pw',
      });

      expect(config.dataDir).toBe(join(homedir(), '.actual-cli', 'data'));
    });

    it('CLI opt overrides default dataDir', async () => {
      const config = await resolveConfig({
        serverUrl: 'http://test',
        password: 'pw',
        dataDir: '/custom/dir',
      });

      expect(config.dataDir).toBe('/custom/dir');
    });
  });

  describe('validation', () => {
    it('throws when serverUrl is missing', async () => {
      await expect(resolveConfig({ password: 'pw' })).rejects.toThrow(
        'Server URL is required',
      );
    });

    it('throws when neither password nor sessionToken provided', async () => {
      await expect(resolveConfig({ serverUrl: 'http://test' })).rejects.toThrow(
        'Authentication required',
      );
    });

    it('accepts sessionToken without password', async () => {
      const config = await resolveConfig({
        serverUrl: 'http://test',
        sessionToken: 'tok',
      });

      expect(config.sessionToken).toBe('tok');
      expect(config.password).toBeUndefined();
    });

    it('accepts password without sessionToken', async () => {
      const config = await resolveConfig({
        serverUrl: 'http://test',
        password: 'pw',
      });

      expect(config.password).toBe('pw');
      expect(config.sessionToken).toBeUndefined();
    });
  });

  describe('cache options', () => {
    beforeEach(() => {
      process.env.ACTUAL_SERVER_URL = 'http://test';
      process.env.ACTUAL_PASSWORD = 'pw';
    });

    it('defaults cacheTtl to 60 seconds', async () => {
      const config = await resolveConfig({});
      expect(config.cacheTtl).toBe(60);
    });

    it('reads cacheTtl from env', async () => {
      process.env.ACTUAL_CACHE_TTL = '300';
      const config = await resolveConfig({});
      expect(config.cacheTtl).toBe(300);
    });

    it('prefers cacheTtl from CLI flag', async () => {
      process.env.ACTUAL_CACHE_TTL = '300';
      const config = await resolveConfig({ cacheTtl: 10 });
      expect(config.cacheTtl).toBe(10);
    });

    it('rejects negative cacheTtl', async () => {
      await expect(resolveConfig({ cacheTtl: -1 })).rejects.toThrow(/cacheTtl/);
    });

    it('rejects non-integer cacheTtl from env', async () => {
      process.env.ACTUAL_CACHE_TTL = 'banana';
      await expect(resolveConfig({})).rejects.toThrow(/ACTUAL_CACHE_TTL/);
    });

    it('defaults lockTimeout to 10 seconds', async () => {
      const config = await resolveConfig({});
      expect(config.lockTimeout).toBe(10);
    });

    it('reads lockTimeout from env', async () => {
      process.env.ACTUAL_LOCK_TIMEOUT = '30';
      const config = await resolveConfig({});
      expect(config.lockTimeout).toBe(30);
    });

    it('defaults refresh to false', async () => {
      const config = await resolveConfig({});
      expect(config.refresh).toBe(false);
    });

    it('sets refresh when provided on CLI opts', async () => {
      const config = await resolveConfig({ refresh: true });
      expect(config.refresh).toBe(true);
    });

    it('sets refresh when --no-cache is passed (cliOpts.cache === false)', async () => {
      const config = await resolveConfig({ cache: false });
      expect(config.refresh).toBe(true);
    });

    it('does not set refresh when cliOpts.cache is true (flag absent)', async () => {
      const config = await resolveConfig({ cache: true });
      expect(config.refresh).toBe(false);
    });

    it('defaults noLock to false', async () => {
      const config = await resolveConfig({});
      expect(config.noLock).toBe(false);
    });

    it('sets noLock when --no-lock is passed (cliOpts.lock === false)', async () => {
      const config = await resolveConfig({ lock: false });
      expect(config.noLock).toBe(true);
    });

    it('leaves noLock false when cliOpts.lock is true (flag absent)', async () => {
      const config = await resolveConfig({ lock: true });
      expect(config.noLock).toBe(false);
    });

    it('parses ACTUAL_NO_LOCK=1 as true', async () => {
      process.env.ACTUAL_NO_LOCK = '1';
      const config = await resolveConfig({});
      expect(config.noLock).toBe(true);
    });

    it('parses ACTUAL_NO_LOCK=true as true', async () => {
      process.env.ACTUAL_NO_LOCK = 'true';
      const config = await resolveConfig({});
      expect(config.noLock).toBe(true);
    });

    it('throws on an invalid ACTUAL_NO_LOCK value', async () => {
      process.env.ACTUAL_NO_LOCK = 'yes';
      await expect(resolveConfig({})).rejects.toThrow(/ACTUAL_NO_LOCK/);
    });

    it('reads cacheTtl/lockTimeout/noLock from config file', async () => {
      mockConfigFile({
        serverUrl: 'http://file',
        password: 'pw',
        cacheTtl: 120,
        lockTimeout: 5,
        noLock: true,
      });
      const config = await resolveConfig({});
      expect(config.cacheTtl).toBe(120);
      expect(config.lockTimeout).toBe(5);
      expect(config.noLock).toBe(true);
    });

    it('rejects non-number cacheTtl in config file', async () => {
      mockConfigFile({
        serverUrl: 'http://file',
        password: 'pw',
        cacheTtl: 'soon',
      });
      await expect(resolveConfig({})).rejects.toThrow(/cacheTtl/);
    });
  });

  describe('cosmiconfig handling', () => {
    it('handles null result (no config file found)', async () => {
      mockConfigFile(null);

      const config = await resolveConfig({
        serverUrl: 'http://test',
        password: 'pw',
      });

      expect(config.serverUrl).toBe('http://test');
    });

    it('handles isEmpty result', async () => {
      mockSearch.mockResolvedValue({ config: {}, isEmpty: true });

      const config = await resolveConfig({
        serverUrl: 'http://test',
        password: 'pw',
      });

      expect(config.serverUrl).toBe('http://test');
    });
  });

  describe('_FILE environment variables', () => {
    let dir: string;

    const writeSecret = (name: string, contents: string) => {
      const filePath = join(dir, name);
      writeFileSync(filePath, contents);
      return filePath;
    };

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'actual-cli-config-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('reads a value from the file it points at, trimming whitespace', async () => {
      process.env.ACTUAL_PASSWORD_FILE = writeSecret('password', 'filepw\n');

      const config = await resolveConfig({ serverUrl: 'http://test' });

      expect(config.password).toBe('filepw');
    });

    it('takes precedence over the plain environment variable', async () => {
      process.env.ACTUAL_PASSWORD = 'envpw';
      process.env.ACTUAL_PASSWORD_FILE = writeSecret('password', 'filepw');

      const config = await resolveConfig({ serverUrl: 'http://test' });

      expect(config.password).toBe('filepw');
    });

    it('still loses to a CLI flag', async () => {
      process.env.ACTUAL_PASSWORD_FILE = writeSecret('password', 'filepw');

      const config = await resolveConfig({
        serverUrl: 'http://test',
        password: 'flagpw',
      });

      expect(config.password).toBe('flagpw');
    });

    it('takes precedence over the config file', async () => {
      process.env.ACTUAL_PASSWORD_FILE = writeSecret('password', 'filepw');
      mockConfigFile({ password: 'configpw' });

      const config = await resolveConfig({ serverUrl: 'http://test' });

      expect(config.password).toBe('filepw');
    });

    it('supports the session token and encryption password too', async () => {
      process.env.ACTUAL_SESSION_TOKEN_FILE = writeSecret('token', 'filetok\n');
      process.env.ACTUAL_ENCRYPTION_PASSWORD_FILE = writeSecret(
        'enc',
        'fileenc',
      );

      const config = await resolveConfig({ serverUrl: 'http://test' });

      expect(config.sessionToken).toBe('filetok');
      expect(config.encryptionPassword).toBe('fileenc');
    });

    it('is not offered for settings that are not secrets', async () => {
      // Following the Docker secrets convention, only secrets get a _FILE
      // variant. A stray one must be ignored, not silently honoured.
      process.env.ACTUAL_SYNC_ID_FILE = writeSecret('sync', 'from-file');
      process.env.ACTUAL_SYNC_ID = 'from-env';

      const config = await resolveConfig({
        serverUrl: 'http://test',
        password: 'pw',
      });

      expect(config.syncId).toBe('from-env');
    });

    it('throws when the _FILE variable is set but empty', async () => {
      process.env.ACTUAL_PASSWORD = 'envpw';
      process.env.ACTUAL_PASSWORD_FILE = '';

      await expect(resolveConfig({ serverUrl: 'http://test' })).rejects.toThrow(
        'Could not read ACTUAL_PASSWORD_FILE',
      );
    });

    it('throws when the file cannot be read instead of falling back', async () => {
      process.env.ACTUAL_PASSWORD = 'envpw';
      process.env.ACTUAL_PASSWORD_FILE = join(dir, 'does-not-exist');

      await expect(resolveConfig({ serverUrl: 'http://test' })).rejects.toThrow(
        'Could not read ACTUAL_PASSWORD_FILE',
      );
    });
  });
});
