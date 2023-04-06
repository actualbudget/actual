const { execSync } = require('child_process');

const {
  SIGN_TOOL_PATH = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\x64\\signtool.exe',
  TIMESTAMP_SERVER = 'http://timestamp.digicert.com',
} = process.env;

const SITE = 'https://actualbudget.com/';

const importPfx = (certPath, password) => {
  /* eslint-disable rulesdir/typography */
  const command = [
    ['certutil'],
    ['-f'],
    ['-p', `"${password}"`],
    ['-importPfx', 'My', `"${certPath}"`, 'NoRoot'],
  ]
    .map(sub => sub.join(' '))
    .join(' ');
  /* eslint-enable rulesdir/typography */

  try {
    execSync(command, { stdio: 'inherit' });
  } catch {
    console.error('Unable to import certificate');
  }
};

const signBinary = (path, name) => {
  /* eslint-disable rulesdir/typography */
  const command = [
    [`"${SIGN_TOOL_PATH}"`],
    ['sign'],
    ['/a'],
    ['/s', 'My'],
    ['/sm'],
    ['/t', `"${TIMESTAMP_SERVER}"`],
    ['/d', `"${name}"`],
    ['/du', `"${SITE}"`],
    [`"${path}"`],
  ]
    .map(sub => sub.join(' '))
    .join(' ');
  /* eslint-enable rulesdir/typography */

  try {
    execSync(command, { stdio: 'inherit' });
  } catch {
    console.error(`Signing ${path} failed`);
  }
};

exports.default = ({ path, name, cscInfo: { file, password } = {} }) => {
  if (!file) return;

  importPfx(file, password);
  signBinary(path, name, file);
};
