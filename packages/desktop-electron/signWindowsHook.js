const { execSync } = require('child_process');

let {
  SIGN_TOOL_PATH = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\x64\\signtool.exe',
  TIMESTAMP_SERVER = 'http://timestamp.digicert.com',
} = process.env;

let SITE = 'https://actualbudget.com/';

let importPfx = (certPath, password) => {
  /* eslint-disable @actual-app/typography */
  let command = [
    ['certutil'],
    ['-f'],
    ['-p', `"${password}"`],
    ['-importPfx', 'My', `"${certPath}"`, 'NoRoot'],
  ]
    .map(sub => sub.join(' '))
    .join(' ');
  /* eslint-enable @actual-app/typography */

  try {
    execSync(command, { stdio: 'inherit' });
  } catch {
    console.error('Unable to import certificate');
  }
};

let signBinary = (path, name) => {
  /* eslint-disable @actual-app/typography */
  let command = [
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
  /* eslint-enable @actual-app/typography */

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
