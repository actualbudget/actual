import { homedir } from 'os';
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
  const envKeys = [
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
});
