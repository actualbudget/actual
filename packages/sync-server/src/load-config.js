import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createDebug from 'debug';

const debug = createDebug('actual:config');
const debugSensitive = createDebug('actual-sensitive:config');

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
debug(`project root: '${projectRoot}'`);
export const sqlDir = path.join(projectRoot, 'src', 'sql');

let defaultDataDir = fs.existsSync('/data') ? '/data' : projectRoot;

if (process.env.ACTUAL_DATA_DIR) {
  defaultDataDir = process.env.ACTUAL_DATA_DIR;
}

debug(`default data directory: '${defaultDataDir}'`);

function parseJSON(path, allowMissing = false) {
  let text;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch (e) {
    if (allowMissing) {
      debug(`config file '${path}' not found, ignoring.`);
      return {};
    }
    throw e;
  }
  return JSON.parse(text);
}

let userConfig;
if (process.env.ACTUAL_CONFIG_PATH) {
  debug(
    `loading config from ACTUAL_CONFIG_PATH: '${process.env.ACTUAL_CONFIG_PATH}'`,
  );
  userConfig = parseJSON(process.env.ACTUAL_CONFIG_PATH);

  defaultDataDir = userConfig.dataDir ?? defaultDataDir;
} else {
  let configFile = path.join(projectRoot, 'config.json');

  if (!fs.existsSync(configFile)) {
    configFile = path.join(defaultDataDir, 'config.json');
  }

  debug(`loading config from default path: '${configFile}'`);
  userConfig = parseJSON(configFile, true);
}

/** @type {Omit<import('./config-types.js').Config, 'mode' | 'dataDir' | 'serverFiles' | 'userFiles'>} */
let defaultConfig = {
  loginMethod: 'password',
  allowedLoginMethods: ['password', 'header', 'openid'],
  // assume local networks are trusted
  trustedProxies: [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    'fc00::/7',
    '::1/128',
  ],
  // fallback to trustedProxies, but in the future trustedProxies will only be used for express trust
  // and trustedAuthProxies will just be for header auth
  trustedAuthProxies: null,
  port: 5006,
  hostname: '::',
  webRoot: path.join(
    projectRoot,
    'node_modules',
    '@actual-app',
    'web',
    'build',
  ),
  upload: {
    fileSizeSyncLimitMB: 20,
    syncEncryptedFileSizeLimitMB: 50,
    fileSizeLimitMB: 20,
  },
  projectRoot,
  multiuser: false,
  token_expiration: 'never',
};

/** @type {import('./config-types.js').Config} */
let config;
if (process.env.NODE_ENV === 'test') {
  config = {
    mode: 'test',
    dataDir: projectRoot,
    serverFiles: path.join(projectRoot, 'test-server-files'),
    userFiles: path.join(projectRoot, 'test-user-files'),
    ...defaultConfig,
  };
} else {
  config = {
    mode: 'development',
    ...defaultConfig,
    dataDir: defaultDataDir,
    serverFiles: path.join(defaultDataDir, 'server-files'),
    userFiles: path.join(defaultDataDir, 'user-files'),
    ...(userConfig || {}),
  };
}

const finalConfig = {
  ...config,
  loginMethod: process.env.ACTUAL_LOGIN_METHOD
    ? process.env.ACTUAL_LOGIN_METHOD.toLowerCase()
    : config.loginMethod,
  multiuser: process.env.ACTUAL_MULTIUSER
    ? (() => {
        const value = process.env.ACTUAL_MULTIUSER.toLowerCase();
        if (!['true', 'false'].includes(value)) {
          throw new Error('ACTUAL_MULTIUSER must be either "true" or "false"');
        }
        return value === 'true';
      })()
    : config.multiuser,
  allowedLoginMethods: process.env.ACTUAL_ALLOWED_LOGIN_METHODS
    ? process.env.ACTUAL_ALLOWED_LOGIN_METHODS.split(',')
        .map((q) => q.trim().toLowerCase())
        .filter(Boolean)
    : config.allowedLoginMethods,
  trustedProxies: process.env.ACTUAL_TRUSTED_PROXIES
    ? process.env.ACTUAL_TRUSTED_PROXIES.split(',')
        .map((q) => q.trim())
        .filter(Boolean)
    : config.trustedProxies,
  trustedAuthProxies: process.env.ACTUAL_TRUSTED_AUTH_PROXIES
    ? process.env.ACTUAL_TRUSTED_AUTH_PROXIES.split(',')
        .map((q) => q.trim())
        .filter(Boolean)
    : config.trustedAuthProxies,
  port: +process.env.ACTUAL_PORT || +process.env.PORT || config.port,
  hostname: process.env.ACTUAL_HOSTNAME || config.hostname,
  serverFiles: process.env.ACTUAL_SERVER_FILES || config.serverFiles,
  userFiles: process.env.ACTUAL_USER_FILES || config.userFiles,
  webRoot: process.env.ACTUAL_WEB_ROOT || config.webRoot,
  https:
    process.env.ACTUAL_HTTPS_KEY && process.env.ACTUAL_HTTPS_CERT
      ? {
          key: process.env.ACTUAL_HTTPS_KEY.replace(/\\n/g, '\n'),
          cert: process.env.ACTUAL_HTTPS_CERT.replace(/\\n/g, '\n'),
          ...(config.https || {}),
        }
      : config.https,
  upload:
    process.env.ACTUAL_UPLOAD_FILE_SYNC_SIZE_LIMIT_MB ||
    process.env.ACTUAL_UPLOAD_SYNC_ENCRYPTED_FILE_SYNC_SIZE_LIMIT_MB ||
    process.env.ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB
      ? {
          fileSizeSyncLimitMB:
            +process.env.ACTUAL_UPLOAD_FILE_SYNC_SIZE_LIMIT_MB ||
            +process.env.ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB ||
            config.upload.fileSizeSyncLimitMB,
          syncEncryptedFileSizeLimitMB:
            +process.env.ACTUAL_UPLOAD_SYNC_ENCRYPTED_FILE_SYNC_SIZE_LIMIT_MB ||
            +process.env.ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB ||
            config.upload.syncEncryptedFileSizeLimitMB,
          fileSizeLimitMB:
            +process.env.ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB ||
            config.upload.fileSizeLimitMB,
        }
      : config.upload,
  openId: (() => {
    if (
      !process.env.ACTUAL_OPENID_DISCOVERY_URL &&
      !process.env.ACTUAL_OPENID_AUTHORIZATION_ENDPOINT
    ) {
      return config.openId;
    }
    const baseConfig = process.env.ACTUAL_OPENID_DISCOVERY_URL
      ? { issuer: process.env.ACTUAL_OPENID_DISCOVERY_URL }
      : {
          ...(() => {
            const required = {
              authorization_endpoint:
                process.env.ACTUAL_OPENID_AUTHORIZATION_ENDPOINT,
              token_endpoint: process.env.ACTUAL_OPENID_TOKEN_ENDPOINT,
              userinfo_endpoint: process.env.ACTUAL_OPENID_USERINFO_ENDPOINT,
            };
            const missing = Object.entries(required)
              .filter(([_, value]) => !value)
              .map(([key]) => key);
            if (missing.length > 0) {
              throw new Error(
                `Missing required OpenID configuration: ${missing.join(', ')}`,
              );
            }
            return {};
          })(),
          issuer: {
            name: process.env.ACTUAL_OPENID_PROVIDER_NAME,
            authorization_endpoint:
              process.env.ACTUAL_OPENID_AUTHORIZATION_ENDPOINT,
            token_endpoint: process.env.ACTUAL_OPENID_TOKEN_ENDPOINT,
            userinfo_endpoint: process.env.ACTUAL_OPENID_USERINFO_ENDPOINT,
          },
        };
    return {
      ...baseConfig,
      client_id:
        process.env.ACTUAL_OPENID_CLIENT_ID ?? config.openId?.client_id,
      client_secret:
        process.env.ACTUAL_OPENID_CLIENT_SECRET ?? config.openId?.client_secret,
      server_hostname:
        process.env.ACTUAL_OPENID_SERVER_HOSTNAME ??
        config.openId?.server_hostname,
    };
  })(),
  token_expiration: process.env.ACTUAL_TOKEN_EXPIRATION
    ? process.env.ACTUAL_TOKEN_EXPIRATION
    : config.token_expiration,
};
debug(`using port ${finalConfig.port}`);
debug(`using hostname ${finalConfig.hostname}`);
debug(`using data directory ${finalConfig.dataDir}`);
debug(`using server files directory ${finalConfig.serverFiles}`);
debug(`using user files directory ${finalConfig.userFiles}`);
debug(`using web root directory ${finalConfig.webRoot}`);
debug(`using login method ${finalConfig.loginMethod}`);
debug(`using trusted proxies ${finalConfig.trustedProxies.join(', ')}`);
debug(
  `using trusted auth proxies ${
    finalConfig.trustedAuthProxies?.join(', ') ?? 'same as trusted proxies'
  }`,
);

if (finalConfig.https) {
  debug(`using https key: ${'*'.repeat(finalConfig.https.key.length)}`);
  debugSensitive(`using https key ${finalConfig.https.key}`);
  debug(`using https cert: ${'*'.repeat(finalConfig.https.cert.length)}`);
  debugSensitive(`using https cert ${finalConfig.https.cert}`);
}

if (finalConfig.upload) {
  debug(`using file sync limit ${finalConfig.upload.fileSizeSyncLimitMB}mb`);
  debug(
    `using sync encrypted file limit ${finalConfig.upload.syncEncryptedFileSizeLimitMB}mb`,
  );
  debug(`using file limit ${finalConfig.upload.fileSizeLimitMB}mb`);
}

export default finalConfig;
