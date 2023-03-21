import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const sqlDir = path.join(projectRoot, 'src', 'sql');
let defaultDataDir = fs.existsSync('/data') ? '/data' : projectRoot;

function parseJSON(path, allowMissing = false) {
  let text;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch (e) {
    if (allowMissing) {
      return {};
    }
    throw e;
  }
  return JSON.parse(text);
}

let userConfig;
if (process.env.ACTUAL_CONFIG_PATH) {
  userConfig = parseJSON(process.env.ACTUAL_CONFIG_PATH);
} else {
  userConfig = parseJSON(path.join(defaultDataDir, 'config.json'), true);
}

/** @type {Omit<import('./config-types.js').Config, 'mode' | 'serverFiles' | 'userFiles'>} */
let defaultConfig = {
  port: 5006,
  hostname: '::',
  webRoot: path.join(
    projectRoot,
    'node_modules',
    '@actual-app',
    'web',
    'build',
  ),
};

/** @type {import('./config-types.js').Config} */
let config;
if (process.env.NODE_ENV === 'test') {
  config = {
    mode: 'test',
    serverFiles: path.join(projectRoot, 'test-server-files'),
    userFiles: path.join(projectRoot, 'test-user-files'),
    ...defaultConfig,
  };
} else {
  config = {
    mode: 'development',
    ...defaultConfig,
    serverFiles: path.join(defaultDataDir, 'server-files'),
    userFiles: path.join(defaultDataDir, 'user-files'),
    ...(userConfig || {}),
  };
}

export default {
  ...config,
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
  nordigen:
    process.env.ACTUAL_NORDIGEN_SECRET_ID &&
    process.env.ACTUAL_NORDIGEN_SECRET_KEY
      ? {
          secretId: process.env.ACTUAL_NORDIGEN_SECRET_ID,
          secretKey: process.env.ACTUAL_NORDIGEN_SECRET_KEY,
          ...(config.nordigen || {}),
        }
      : config.nordigen,
};
