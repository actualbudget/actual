#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const args = process.argv;

const options = {
  help: {
    type: 'boolean',
    short: 'h',
  },
  version: {
    type: 'boolean',
    short: 'v',
  },
  'reset-password': {
    type: 'boolean',
  },
  config: {
    type: 'string',
  },
};

const { values } = parseArgs({
  args,
  options,
  allowPositionals: true,
});

if (values.help) {
  console.log(
    [
      'usage: actual-server [options]',
      '',
      'options:',
      '  --config           Path to config file',
      '',
      '  -h --help          Print this list and exit.',
      '  -v --version       Print the version and exit.',
      '',
      'Examples:',
      '',
      'Runs actual-server with default configuration',
      '  actual-server',
      '',
      'Runs actual-server with custom configuration',
      '  actual-server --config ./config.json',
    ].join('\n'),
  );

  process.exit();
}

if (values.version) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = resolve(__dirname, '../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  console.log('v' + packageJson.version);
  process.exit();
}

const setupDataDir = (dataDir = undefined) => {
  if (process.env.ACTUAL_DATA_DIR) {
    return; // Env variables must not be overwritten
  }

  if (dataDir) {
    process.env.ACTUAL_DATA_DIR = dataDir; // Use the dir specified
  } else {
    // Setup defaults
    if (existsSync('./data')) {
      // The default data directory exists - use it
      console.info('Found existing data directory');
      process.env.ACTUAL_DATA_DIR = resolve('./data');
    } else {
      console.info(
        'Using default data directory. You can specify a custom config with --config',
      );
      process.env.ACTUAL_DATA_DIR = resolve('./');
    }

    console.info(`Data directory: ${process.env.ACTUAL_DATA_DIR}`);
  }
};

if (values.config) {
  const configExists = existsSync(values.config);

  if (!configExists) {
    console.log(
      `Please specify a valid config path. The path ${values.config} does not exist.`,
    );

    process.exit();
  } else {
    console.log(`Loading config from ${values.config}`);
    const configJson = JSON.parse(readFileSync(values.config, 'utf-8'));
    process.env.ACTUAL_CONFIG_PATH = values.config;
    setupDataDir(configJson.dataDir);
  }
} else {
  // If no config is specified, check for a default config in the current directory
  const defaultConfigJsonFile = './config.json';
  const configExists = existsSync(defaultConfigJsonFile);

  if (configExists) {
    console.info('Found config.json in the current directory');
    const configJson = JSON.parse(readFileSync(defaultConfigJsonFile, 'utf-8'));
    process.env.ACTUAL_CONFIG_PATH = defaultConfigJsonFile;
    setupDataDir(configJson.dataDir);
  } else {
    setupDataDir(); // No default config exists - setup data dir with defaults
  }
}

if (values['reset-password']) {
  console.info('Running reset password script...');
  await import('../src/scripts/reset-password.js');
  process.exit();
}

// start the sync server
import('../app.js');
