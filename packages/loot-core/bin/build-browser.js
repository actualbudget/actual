const { execSync } = require('child_process');
const {
  mkdirSync,
  existsSync,
  unlinkSync,
  readdirSync,
  symlinkSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} = require('fs');
const { resolve, join, relative } = require('path');

const copyfiles = require('copyfiles');

const ROOT = process.cwd();
let WEBPACK_ARGS = '';

// recursively find files
function findFiles(dir, relativeToDir) {
  const files = [];
  const items = readdirSync(dir, { withFileTypes: true });

  items.forEach(item => {
    const itemPath = join(dir, item.name);
    if (item.isFile()) {
      files.push(relative(relativeToDir, itemPath).replace(/\\/g, '/'));
    } else if (item.isDirectory()) {
      files.push(...findFiles(itemPath, relativeToDir));
    }
  });

  return files;
}

const PUBLIC_DIR = resolve(ROOT, '../desktop-client/public');
const DATA_DIR = join(PUBLIC_DIR, 'data');
mkdirSync(DATA_DIR, { recursive: true });

execSync(`node ${join(ROOT, 'bin', 'copy-migrations.js')} ${DATA_DIR}`, {
  stdio: 'inherit',
});

process.chdir(DATA_DIR);

// Find and sort files in DATA_DIR
const files = findFiles(DATA_DIR, DATA_DIR).sort();

// Write sorted files to the output file
const outputFilePath = resolve(PUBLIC_DIR, 'data-file-index.txt');
writeFileSync(outputFilePath, files.join('\n'), 'utf8');

console.log(`File list written to ${outputFilePath}`);

process.chdir(ROOT);

let OUTPUT_HASH = '[contenthash]';
if (process.env.NODE_ENV === 'development') {
  // Use a constant filename in development mode to make it easier to rebuild
  // the backend without having to rebuild the frontend
  OUTPUT_HASH = 'dev';
}

// Clean out previous build files
rmSync('lib-dist/browser', { recursive: true, force: true });
rmSync('../desktop-client/public/kcab', { recursive: true, force: true });

if (process.env.NODE_ENV === 'development') {
  // In dev mode, always enable watch mode and symlink the build files
  // before starting the build, since watch mode will block
  WEBPACK_ARGS += ' --watch';
  if (process.platform === 'win32') {
    // Ensure symlinks are created as native Windows symlinks
    process.env.MSYS = 'winsymlinks:nativestrict';
  }
  const linkTarget = resolve(ROOT, 'lib-dist/browser');
  const linkPath = resolve(PUBLIC_DIR, 'kcab');
  if (existsSync(linkPath)) {
    unlinkSync(linkPath);
  }
  symlinkSync(linkTarget, linkPath, 'dir');
}

// Copy SQL WASM file
const sqlWasmSource = resolve(
  ROOT,
  '../../node_modules/@jlongster/sql.js/dist/sql-wasm.wasm',
);
const sqlWasmTarget = join(PUBLIC_DIR, 'sql-wasm.wasm');
copyFileSync(sqlWasmSource, sqlWasmTarget);

// Run Webpack
const webpackCommand = `yarn webpack --config webpack/webpack.browser.config.js \
  --target webworker \
  --output-filename kcab.worker.${OUTPUT_HASH}.js \
  --output-chunk-filename [id].[name].kcab.worker.${OUTPUT_HASH}.js \
  --progress \
  ${WEBPACK_ARGS}`;
execSync(webpackCommand, { stdio: 'inherit' });

if (process.env.NODE_ENV === 'production') {
  // In production, just copy the built files
  const kcabDir = resolve(PUBLIC_DIR, 'kcab');
  mkdirSync(kcabDir, { recursive: true });

  copyfiles(
    ['./lib-dist/browser/*', kcabDir],
    { error: true, up: true },
    () => {
      console.log(`Copied lib-dist/browser to ${kcabDir}`);
    },
  );
}
