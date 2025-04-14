#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

import packageJson from '../package.json' with { type: 'json' };

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
  console.info(
    'Using default config. You can specify a custom config with --config',
  );
  process.env.ACTUAL_DATA_DIR = './';
  console.info(
    'user-files and server-files will be created in the current directory',
  );
}

// start the sync server
import('../app.js');
