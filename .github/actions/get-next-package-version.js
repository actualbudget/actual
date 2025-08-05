#!/usr/bin/env node

// This script is used in GitHub Actions to get the next version based on the current package.json version.
// It supports three types of versioning: nightly, hotfix, and monthly.

const { parseArgs } = require('node:util');
const fs = require('node:fs');

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

  // Read and parse package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;

  // Parse year and month from version (e.g. 25.5.1 -> year=2025, month=5)
  const versionParts = currentVersion.split('.');
  const versionYear = parseInt(versionParts[0]);
  const versionMonth = parseInt(versionParts[1]);
  const versionHotfix = parseInt(versionParts[2]);

  // Create date and add 1 month
  const versionDate = new Date(2000 + versionYear, versionMonth - 1, 1); // month is 0-indexed
  const nextVersionMonthDate = new Date(
    versionDate.getFullYear(),
    versionDate.getMonth() + 1,
    1,
  );

  // Format back to YY.M format
  const nextVersionYear = nextVersionMonthDate
    .getFullYear()
    .toString()
    .slice(-2);
  const nextVersionMonth = nextVersionMonthDate.getMonth() + 1; // Convert back to 1-indexed

  // Get current date string
  const currentDate = new Date();
  const currentDateString = currentDate
    .toISOString()
    .split('T')[0]
    .replaceAll('-', '');

  if (values.type === 'auto') {
    if (currentDate.getDay() <= 25) {
      values.type = 'hotfix';
    } else {
      values.type = 'monthly';
    }
  }

  switch (values.type) {
    case 'nightly': {
      const newVersion = `${nextVersionYear}.${nextVersionMonth}.0-nightly.${currentDateString}`;
      process.stdout.write(newVersion); // return the new version to stdout
      process.exit();
    }
    case 'hotfix': {
      const bugfixVersion = `${versionYear}.${versionMonth}.${versionHotfix + 1}`;
      process.stdout.write(bugfixVersion); // return the bugfix version to stdout
      process.exit();
    }
    case 'monthly': {
      const stableVersion = `${nextVersionYear}.${nextVersionMonth}.0`;
      process.stdout.write(stableVersion); // return the stable version to stdout
      process.exit();
    }
    default:
      console.error(
        'Invalid type specified. Use "auto", "nightly", "hotfix", or "monthly".',
      );
      process.exit(1);
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
