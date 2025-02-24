import convict from 'convict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createDebug from 'debug';
import { createRequire } from 'module';

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

/*
  Sub-Schemas
*/
const openIdIssuerSchema = convict({
  name: { doc: 'OpenID provider name.', format: String, default: '' },
  authorization_endpoint: {
    doc: 'OpenID authorization endpoint.',
    format: String,
    default: '',
  },
  token_endpoint: {
    doc: 'OpenID token endpoint.',
    format: String,
    default: '',
  },
  userinfo_endpoint: {
    doc: 'OpenID user info endpoint.',
    format: String,
    default: '',
  },
});

const openIdSchema = convict({
  issuer: {
    doc: 'OpenID issuer URL or object.',
    format: '*',
    default: '',
    env: 'ACTUAL_OPENID_DISCOVERY_URL',
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
    doc: 'Authentication method for OpenID.',
    format: ['openid', 'oauth2'],
    default: 'openid',
  },
});

const httpsSchema = convict({
  key: { doc: 'HTTPS key.', format: String, default: '' },
  cert: { doc: 'HTTPS certificate.', format: String, default: '' },
});

const uploadSchema = convict({
  fileSizeSyncLimitMB: {
    doc: 'Max file sync upload size.',
    format: 'nat',
    default: 20,
  },
  syncEncryptedFileSizeLimitMB: {
    doc: 'Max encrypted file sync upload size.',
    format: 'nat',
    default: 50,
  },
  fileSizeLimitMB: { doc: 'Max file upload size.', format: 'nat', default: 20 },
});

/*
  Helper Functions
*/
function isAllEmpty(obj) {
  if (!obj || typeof obj !== 'object') return true;
  const keys = Object.keys(obj);
  if (keys.length === 0) return true;
  return keys.every(key => {
    const val = obj[key];
    if (!val) return true;
    if (typeof val === 'object') return isAllEmpty(val);
    return false;
  });
}

function loadSubConfig(schema, data) {
  if (!data || isAllEmpty(data)) return null;
  const loaded = schema.load(data);
  loaded.validate({ allowed: 'strict' });
  const finalData = loaded.getProperties();
  return isAllEmpty(finalData) ? null : finalData;
}

/*
  Main Config Schema
*/
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
    default: fs.existsSync('/data') ? '/data' : projectRoot,
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
  trustedAuthProxies: {
    doc: 'List of trusted authentication proxies.',
    format: Array,
    default: [],
    env: 'ACTUAL_TRUSTED_AUTH_PROXIES',
  },
  multiuser: {
    doc: 'Enable multi-user mode.',
    format: Boolean,
    default: false,
    env: 'ACTUAL_MULTIUSER',
  },
  https: {
    doc: 'HTTPS configuration.',
    format: Object,
    default: null,
    nullable: true,
  },
  upload: {
    doc: 'Upload configuration.',
    format: Object,
    default: {
      fileSizeSyncLimitMB: 20,
      syncEncryptedFileSizeLimitMB: 50,
      fileSizeLimitMB: 20,
    },
    nullable: true,
  },
  openId: {
    doc: 'OpenID authentication settings.',
    format: Object,
    default: null,
    nullable: true,
  },
  token_expiration: {
    doc: 'Token expiration time.',
    format: ['never', 'openid-provider', 'nat'],
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

configSchema.validate({ allowed: 'strict' });
const config = configSchema.getProperties();

/*
  Apply Sub-Schema Validation & Final Assembly
*/

// OpenID
if (config.openId) {
  let loadedOpenId = loadSubConfig(openIdSchema, config.openId);
  if (loadedOpenId?.issuer && typeof loadedOpenId.issuer === 'object') {
    loadedOpenId.issuer = loadSubConfig(
      openIdIssuerSchema,
      loadedOpenId.issuer,
    );
  }
  config.openId = isAllEmpty(loadedOpenId) ? null : loadedOpenId;
}

// HTTPS
config.https = loadSubConfig(httpsSchema, config.https);

// Upload
config.upload = loadSubConfig(uploadSchema, config.upload);

// Debug logs
debug(`Using project root: ${config.projectRoot}`);
debug(`Using port: ${config.port}`);
debug(`Using hostname: ${config.hostname}`);
debug(`Using data directory: ${config.dataDir}`);
debug(`Using server files directory: ${config.serverFiles}`);
debug(`Using user files directory: ${config.userFiles}`);
debug(`Using web root directory: ${config.webRoot}`);
debug(`Using login method: ${config.loginMethod}`);
debug(`Multiuser? ${config.multiuser}`);
debug(`Allowed methods: ${config.allowedLoginMethods.join(', ')}`);
debug(`Trusted proxies: ${config.trustedProxies.join(', ')}`);
debug(`Trusted auth proxies: ${config.trustedAuthProxies.join(', ')}`);

debugSensitive(
  `HTTPS Key: ${
    config.https?.key ? '*'.repeat(config.https.key.length) : 'Not Set'
  }`,
);
debugSensitive(
  `HTTPS Cert: ${
    config.https?.cert ? '*'.repeat(config.https.cert.length) : 'Not Set'
  }`,
);

export { config };
