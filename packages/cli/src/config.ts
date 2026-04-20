import { homedir } from 'os';
import { join } from 'path';

import { cosmiconfig } from 'cosmiconfig';

import { isRecord, parseBoolEnv, parseNonNegativeIntFlag } from './utils';

export type CliConfig = {
  serverUrl: string;
  password?: string;
  sessionToken?: string;
  syncId?: string;
  dataDir: string;
  encryptionPassword?: string;
  cacheTtl: number;
  lockTimeout: number;
  refresh: boolean;
  noLock: boolean;
};

export type CliGlobalOpts = {
  serverUrl?: string;
  password?: string;
  sessionToken?: string;
  syncId?: string;
  dataDir?: string;
  encryptionPassword?: string;
  cacheTtl?: number;
  lockTimeout?: number;
  refresh?: boolean;
  // Commander stores --no-foo flags under the positive key. Default true,
  // false when the flag is passed.
  cache?: boolean;
  lock?: boolean;
  format?: 'json' | 'table' | 'csv';
  verbose?: boolean;
};

const stringKeys = [
  'serverUrl',
  'password',
  'sessionToken',
  'syncId',
  'dataDir',
  'encryptionPassword',
] as const;

const numberKeys = ['cacheTtl', 'lockTimeout'] as const;
const booleanKeys = ['noLock'] as const;

type ConfigFileContent = {
  serverUrl?: string;
  password?: string;
  sessionToken?: string;
  syncId?: string;
  dataDir?: string;
  encryptionPassword?: string;
  cacheTtl?: number;
  lockTimeout?: number;
  noLock?: boolean;
};

const configFileKeys: readonly string[] = [
  ...stringKeys,
  ...numberKeys,
  ...booleanKeys,
];

function validateConfigFileContent(value: unknown): ConfigFileContent {
  if (!isRecord(value)) {
    throw new Error(
      'Invalid config file: expected an object with keys: ' +
        configFileKeys.join(', '),
    );
  }
  for (const key of Object.keys(value)) {
    if (!configFileKeys.includes(key)) {
      throw new Error(`Invalid config file: unknown key "${key}"`);
    }
    const v = value[key];
    if (v === undefined) continue;
    if (
      (stringKeys as readonly string[]).includes(key) &&
      typeof v !== 'string'
    ) {
      throw new Error(
        `Invalid config file: key "${key}" must be a string, got ${typeof v}`,
      );
    }
    if (
      (numberKeys as readonly string[]).includes(key) &&
      (typeof v !== 'number' || !Number.isInteger(v) || v < 0)
    ) {
      throw new Error(
        `Invalid config file: key "${key}" must be a non-negative integer`,
      );
    }
    if (
      (booleanKeys as readonly string[]).includes(key) &&
      typeof v !== 'boolean'
    ) {
      throw new Error(
        `Invalid config file: key "${key}" must be a boolean, got ${typeof v}`,
      );
    }
  }
  return value as ConfigFileContent;
}

async function loadConfigFile(): Promise<ConfigFileContent> {
  const explorer = cosmiconfig('actual', {
    searchPlaces: [
      'package.json',
      '.actualrc',
      '.actualrc.json',
      '.actualrc.yaml',
      '.actualrc.yml',
      'actual.config.json',
      'actual.config.yaml',
      'actual.config.yml',
    ],
  });
  const result = await explorer.search();
  if (result && !result.isEmpty) {
    return validateConfigFileContent(result.config);
  }
  return {};
}

function parseNonNegativeIntEnv(
  raw: string | undefined,
  source: string,
): number | undefined {
  return raw === undefined ? undefined : parseNonNegativeIntFlag(raw, source);
}

function validateNonNegativeInt(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid ${name}: expected a non-negative integer, got ${value}`,
    );
  }
  return value;
}

export async function resolveConfig(
  cliOpts: CliGlobalOpts,
): Promise<CliConfig> {
  const fileConfig = await loadConfigFile();

  const serverUrl =
    cliOpts.serverUrl ??
    process.env.ACTUAL_SERVER_URL ??
    fileConfig.serverUrl ??
    '';

  const password =
    cliOpts.password ?? process.env.ACTUAL_PASSWORD ?? fileConfig.password;

  const sessionToken =
    cliOpts.sessionToken ??
    process.env.ACTUAL_SESSION_TOKEN ??
    fileConfig.sessionToken;

  const syncId =
    cliOpts.syncId ?? process.env.ACTUAL_SYNC_ID ?? fileConfig.syncId;

  const dataDir =
    cliOpts.dataDir ??
    process.env.ACTUAL_DATA_DIR ??
    fileConfig.dataDir ??
    join(homedir(), '.actual-cli', 'data');

  const encryptionPassword =
    cliOpts.encryptionPassword ??
    process.env.ACTUAL_ENCRYPTION_PASSWORD ??
    fileConfig.encryptionPassword;

  if (!serverUrl) {
    throw new Error(
      'Server URL is required. Set --server-url, ACTUAL_SERVER_URL env var, or serverUrl in config file.',
    );
  }

  if (!password && !sessionToken) {
    throw new Error(
      'Authentication required. Set --password/--session-token, ACTUAL_PASSWORD/ACTUAL_SESSION_TOKEN env var, or password/sessionToken in config file.',
    );
  }

  const cacheTtl = validateNonNegativeInt(
    cliOpts.cacheTtl ??
      parseNonNegativeIntEnv(
        process.env.ACTUAL_CACHE_TTL,
        'ACTUAL_CACHE_TTL',
      ) ??
      fileConfig.cacheTtl ??
      60,
    'cacheTtl',
  );

  const lockTimeout = validateNonNegativeInt(
    cliOpts.lockTimeout ??
      parseNonNegativeIntEnv(
        process.env.ACTUAL_LOCK_TIMEOUT,
        'ACTUAL_LOCK_TIMEOUT',
      ) ??
      fileConfig.lockTimeout ??
      10,
    'lockTimeout',
  );

  const refresh = (cliOpts.refresh ?? false) || cliOpts.cache === false;

  const flagNoLock = cliOpts.lock === false ? true : undefined;
  const noLock =
    flagNoLock ??
    parseBoolEnv(process.env.ACTUAL_NO_LOCK, 'ACTUAL_NO_LOCK') ??
    fileConfig.noLock ??
    false;

  return {
    serverUrl,
    password,
    sessionToken,
    syncId,
    dataDir,
    encryptionPassword,
    cacheTtl,
    lockTimeout,
    refresh,
    noLock,
  };
}
