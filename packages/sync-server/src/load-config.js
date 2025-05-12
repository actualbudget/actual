import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import convict from 'convict';
import createDebug from 'debug';

const require = createRequire(import.meta.url);
const debug = createDebug('actual:config');
const debugSensitive = createDebug('actual-sensitive:config');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.dirname(__dirname).replace(/[\\/]build$/, '');
const defaultDataDir = process.env.ACTUAL_DATA_DIR
  ? process.env.ACTUAL_DATA_DIR
  : fs.existsSync('/data')
    ? '/data'
    : projectRoot;

debug(`Project root: '${projectRoot}'`);

export const sqlDir = path.join(__dirname, 'sql');

const actualAppWebBuildPath = path.join(
  path.dirname(require.resolve('@actual-app/web/package.json')),
  'build',
);
debug(`Actual web build path: '${actualAppWebBuildPath}'`);

// Custom formats
convict.addFormat({
  name: 'tokenExpiration',
  validate(val) {
    if (val === 'never' || val === 'openid-provider') return;
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) return;
    throw new Error(`Invalid token_expiration value: ${val}`);
  },
});

// Main config schema
const configSchema = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  mode: {
    doc: 'Application mode.',
    format: ['test', 'development'],
    default: process.env.NODE_ENV === 'test' ? 'test' : 'development',
  },
  projectRoot: {
    doc: 'Project root directory.',
    format: String,
    default: projectRoot,
  },
  dataDir: {
    doc: 'Default data directory.',
    format: String,
    default: process.env.NODE_ENV === 'test' ? projectRoot : defaultDataDir,
    env: 'ACTUAL_DATA_DIR',
  },
  port: {
    doc: 'Port to run the server on.',
    format: 'port',
    default: process.env.PORT ? process.env.PORT : 5006,
    env: 'ACTUAL_PORT',
  },
  hostname: {
    doc: 'Server hostname.',
    format: String,
    default: '::',
    env: 'ACTUAL_HOSTNAME',
  },
  serverFiles: {
    doc: 'Path to server files.',
    format: String,
    default:
      process.env.NODE_ENV === 'test'
        ? path.join(projectRoot, 'test-server-files')
        : path.join(defaultDataDir, 'server-files'),
    env: 'ACTUAL_SERVER_FILES',
  },
  userFiles: {
    doc: 'Path to user files.',
    format: String,
    default:
      process.env.NODE_ENV === 'test'
        ? path.join(projectRoot, 'test-user-files')
        : path.join(defaultDataDir, 'user-files'),
    env: 'ACTUAL_USER_FILES',
  },
  webRoot: {
    doc: 'Web root directory.',
    format: String,
    default: actualAppWebBuildPath,
    env: 'ACTUAL_WEB_ROOT',
  },
  loginMethod: {
    doc: 'Authentication method.',
    format: ['password', 'header', 'openid'],
    default: 'password',
    env: 'ACTUAL_LOGIN_METHOD',
  },
  allowedLoginMethods: {
    doc: 'Allowed authentication methods.',
    format: Array,
    default: ['password', 'header', 'openid'],
    env: 'ACTUAL_ALLOWED_LOGIN_METHODS',
  },
  trustedProxies: {
    doc: 'List of trusted proxies.',
    format: Array,
    default: [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      'fc00::/7',
      '::1/128',
    ],
    env: 'ACTUAL_TRUSTED_PROXIES',
  },
  trustedAuthProxies: {
    doc: 'List of trusted auth proxies.',
    format: Array,
    default: [],
    env: 'ACTUAL_TRUSTED_AUTH_PROXIES',
  },

  https: {
    doc: 'HTTPS configuration.',

    key: {
      doc: 'HTTPS Certificate key',
      format: String,
      default: '',
      env: 'ACTUAL_HTTPS_KEY',
    },

    cert: {
      doc: 'HTTPS Certificate',
      format: String,
      default: '',
      env: 'ACTUAL_HTTPS_CERT',
    },
  },

  upload: {
    doc: 'Upload configuration.',

    fileSizeSyncLimitMB: {
      doc: 'Sync file size limit (in MB)',
      format: 'nat',
      default: 20,
      env: 'ACTUAL_UPLOAD_FILE_SYNC_SIZE_LIMIT_MB',
    },

    syncEncryptedFileSizeLimitMB: {
      doc: 'Encrypted Sync file size limit (in MB)',
      format: 'nat',
      default: 50,
      env: 'ACTUAL_UPLOAD_SYNC_ENCRYPTED_FILE_SYNC_SIZE_LIMIT_MB',
    },

    fileSizeLimitMB: {
      doc: 'General file size limit (in MB)',
      format: 'nat',
      default: 20,
      env: 'ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB',
    },
  },

  openId: {
    doc: 'OpenID authentication settings.',

    discoveryURL: {
      doc: 'OpenID Provider discovery URL.',
      format: String,
      default: '',
      env: 'ACTUAL_OPENID_DISCOVERY_URL',
    },
    issuer: {
      doc: 'OpenID issuer',
      format: Object,
      default: {},
      name: {
        doc: 'Name of the provider',
        default: '',
        format: String,
        env: 'ACTUAL_OPENID_PROVIDER_NAME',
      },
      authorization_endpoint: {
        doc: 'Authorization endpoint',
        default: '',
        format: String,
        env: 'ACTUAL_OPENID_AUTHORIZATION_ENDPOINT',
      },
      token_endpoint: {
        doc: 'Token endpoint',
        default: '',
        format: String,
        env: 'ACTUAL_OPENID_TOKEN_ENDPOINT',
      },
      userinfo_endpoint: {
        doc: 'Userinfo endpoint',
        default: '',
        format: String,
        env: 'ACTUAL_OPENID_USERINFO_ENDPOINT',
      },
    },
    client_id: {
      doc: 'OpenID client ID.',
      format: String,
      default: '',
      env: 'ACTUAL_OPENID_CLIENT_ID',
    },
    client_secret: {
      doc: 'OpenID client secret.',
      format: String,
      default: '',
      env: 'ACTUAL_OPENID_CLIENT_SECRET',
    },
    server_hostname: {
      doc: 'OpenID server hostname.',
      format: String,
      default: '',
      env: 'ACTUAL_OPENID_SERVER_HOSTNAME',
    },
    authMethod: {
      doc: 'OpenID authentication method.',
      format: ['openid', 'oauth2'],
      default: 'openid',
      env: 'ACTUAL_OPENID_AUTH_METHOD',
    },
  },

  token_expiration: {
    doc: 'Token expiration time.',
    format: 'tokenExpiration',
    default: 'never',
    env: 'ACTUAL_TOKEN_EXPIRATION',
  },

  enforceOpenId: {
    doc: 'Enforce OpenID authentication.',
    format: Boolean,
    default: false,
    env: 'ACTUAL_OPENID_ENFORCE',
  },

  userCreationMode: {
    doc: 'Determines how users can be created.',
    format: ['manual', 'login'],
    default: 'manual',
    env: 'ACTUAL_USER_CREATION_MODE',
  },
});

let configPath = null;

if (process.env.ACTUAL_CONFIG_PATH) {
  debug(
    `loading config from ACTUAL_CONFIG_PATH: '${process.env.ACTUAL_CONFIG_PATH}'`,
  );
  configPath = process.env.ACTUAL_CONFIG_PATH;
} else {
  configPath = path.join(projectRoot, 'config.json');

  if (!fs.existsSync(configPath)) {
    configPath = path.join(defaultDataDir, 'config.json');
  }

  debug(`loading config from default path: '${configPath}'`);
}

if (fs.existsSync(configPath)) {
  configSchema.loadFile(configPath);
  debug(`Config loaded`);
}

debug(`Validating config`);
configSchema.validate({ allowed: 'strict' });

debug(`Project root: ${configSchema.get('projectRoot')}`);
debug(`Port: ${configSchema.get('port')}`);
debug(`Hostname: ${configSchema.get('hostname')}`);
debug(`Data directory: ${configSchema.get('dataDir')}`);
debug(`Server files: ${configSchema.get('serverFiles')}`);
debug(`User files: ${configSchema.get('userFiles')}`);
debug(`Web root: ${configSchema.get('webRoot')}`);
debug(`Login method: ${configSchema.get('loginMethod')}`);
debug(`Allowed methods: ${configSchema.get('allowedLoginMethods').join(', ')}`);

const httpsKey = configSchema.get('https.key');
if (httpsKey) {
  debug(`HTTPS Key: ${'*'.repeat(httpsKey.length)}`);
  debugSensitive(`HTTPS Key: ${httpsKey}`);
}

const httpsCert = configSchema.get('https.cert');
if (httpsCert) {
  debug(`HTTPS Cert: ${'*'.repeat(httpsCert.length)}`);
  debugSensitive(`HTTPS Cert: ${httpsCert}`);
}

export { configSchema as config };
