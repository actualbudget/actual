const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const packageRoot = path.join(__dirname, '..');
const zipPath = path.join(packageRoot, 'dist', 'dummy-bank-sync.zip');
const defaultPluginsDir = path.join(
  packageRoot,
  '..',
  'sync-server',
  'server-files',
  'plugins',
);
const pluginsDir = process.env.ACTUAL_DUMMY_PLUGIN_DIR || defaultPluginsDir;

const result = spawnSync('yarn', ['build:zip'], {
  cwd: packageRoot,
  shell: true,
  stdio: 'inherit',
});
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

fs.mkdirSync(pluginsDir, { recursive: true });
const targetPath = path.join(pluginsDir, path.basename(zipPath));
fs.copyFileSync(zipPath, targetPath);

console.log(`Installed ${targetPath}`);
