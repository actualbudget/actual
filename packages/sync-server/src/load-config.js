import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import convict from 'convict';
import createDebug from 'debug';

const require = createRequire(import.meta.url);
const debug = createDebug('actual:config');
const debugSensitive = createDebug('actual-sensitive:config');

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
debug(`Project root: '${projectRoot}'`);

export const sqlDir = path.join(projectRoot, 'src', 'sql');

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
    default: 'development',
  },
  projectRoot: {
    doc: 'Project root directory.',
    format: String,
    default: projectRoot,
  },
  dataDir: {
    doc: 'Default data directory.',
    format: String,
    default: fs.existsSync('./data') ? '/data' : projectRoot,
    env: 'ACTUAL_DATA_DIR',
  },
  port: {
    doc: 'Port to run the server on.',
    format: 'port',
    default: 5006,
    env: ['ACTUAL_PORT', 'PORT'],
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
    default: path.join(projectRoot, 'server-files'),
    env: 'ACTUAL_SERVER_FILES',
  },
  userFiles: {
    doc: 'Path to user files.',
    format: String,
    default: path.join(projectRoot, 'user-files'),
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

  https: {
    doc: 'HTTPS configuration.',
    format: Object,
    default: {
      key: '',
      cert: '',
    },
  },

  upload: {
    doc: 'Upload configuration.',
    format: Object,
    default: {
      fileSizeSyncLimitMB: 20,
      syncEncryptedFileSizeLimitMB: 50,
      fileSizeLimitMB: 20,
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
      doc: 'OpenID issuer object ({ name, authorization_endpoint, token_endpoint, userinfo_endpoint }).',
      format: Object,
      default: null,
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
});

configSchema.loadFile('config.json');

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
debugSensitive(
  `HTTPS Key: ${httpsKey ? '*'.repeat(httpsKey.length) : 'Not Set'}`,
);

const httpsCert = configSchema.get('https.cert');
debugSensitive(
  `HTTPS Cert: ${httpsCert ? '*'.repeat(httpsCert.length) : 'Not Set'}`,
);

export { configSchema as config };
