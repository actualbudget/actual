#!/usr/bin/env node

import packageJson from '../package.json' with { type: 'json' };

const getArgs = () =>
  process.argv.reduce((args, arg) => {
    // long arg
    if (arg.slice(0, 2) === '--') {
      const longArg = arg.split(' ');
      const longArgFlag = longArg[0].slice(2);
      const longArgValue = longArg.length > 1 ? longArg[1] : null;
      args[longArgFlag] = longArgValue;
    }
    // flags
    else if (arg[0] === '-') {
      const flags = arg.slice(1).split('');
      flags.forEach(flag => {
        args[flag] = true;
      });
    }
    return args;
  }, {});

const args = getArgs();

if (args.h || args.help) {
  console.log(
    [
      'usage: npx @actual-app/sync-server [options]',
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
      '  npx @actual-app/sync-server',
      '',
      'Runs actual-server with custom configuration',
      '  npx @actual-app/sync-server --config ./config.json',
    ].join('\n'),
  );

  process.exit();
}

if (args.v || args.version) {
  console.log('v' + packageJson.version);

  process.exit();
}

// Read the config argument if specified
if (Object.hasOwn(args, 'config')) {
  if (args.config === null) {
    console.log(`Please specify a valid config path`);

    process.exit();
  } else if (args.config) {
    console.log(`Loading config from ${args.config}`);
    process.env.ACTUAL_CONFIG_PATH = args.config;
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
