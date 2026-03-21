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
