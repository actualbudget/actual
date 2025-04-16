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
  const packageJsonPath = resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  console.log('v' + packageJson.version);
  process.exit();
}

// Read the config argument if specified
if (values.config) {
  const configExists = existsSync(values.config);

  if (!configExists) {
    console.log(
      `Please specify a valid config path. The path ${values.config} does not exist.`,
    );

    process.exit();
  } else if (values.config) {
    console.log(`Loading config from ${values.config}`);
    process.env.ACTUAL_CONFIG_PATH = values.config;
  }
} else {
  // No config specified, use reasonable defaults
  if (!process.env.ACTUAL_DATA_DIR) {
    if (existsSync('./data')) {
      console.info('Found existing data directory');
      process.env.ACTUAL_DATA_DIR = './data';
    } else {
      console.info(
        'Using default data directory. You can specify a custom config with --config',
      );
      process.env.ACTUAL_DATA_DIR = './';
    }

    console.info(`Data directory: ${process.env.ACTUAL_DATA_DIR}`);
  }
}

// start the sync server
import('../app.js');
