#!/usr/bin/env node

// This script is used in GitHub Actions to get the next version based on the current package.json version.
// It supports three types of versioning: nightly, hotfix, and monthly.

import fs from 'node:fs';
import { parseArgs } from 'node:util';

import { getNextVersion } from '../src/versions/get-next-package-version.js';

const args = process.argv;

const options = {
  'package-json': {
    type: 'string',
    short: 'p',
  },
  type: {
    type: 'string', // nightly, hotfix, monthly, auto
    short: 't',
  },
  version: {
    type: 'string',
    short: 'v',
  },
  update: {
    type: 'boolean',
    short: 'u',
    default: false,
  },
};

const { values } = parseArgs({
  args,
  options,
  allowPositionals: true,
});

if (!values['package-json']) {
  console.error(
    'Please specify the path to package.json using --package-json or -p option.',
  );
  process.exit(1);
}

try {
  const packageJsonPath = values['package-json'];
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;

  const explicitVersion = values.version;
  let newVersion;
  if (explicitVersion) {
    newVersion = explicitVersion;
  } else {
    try {
      newVersion = getNextVersion({
        currentVersion,
        type: values.type,
        currentDate: new Date(),
      });
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }

  process.stdout.write(newVersion);

  if (values.update) {
    packageJson.version = newVersion;
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
      'utf8',
    );
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
