import { execFileSync } from 'node:child_process';

// Electron >= 42 downloads its binary on the first launch instead of at
// install time. Fetch it before the test workers start, otherwise parallel
// workers race the download/extraction and `electron.launch` fails with
// `spawn ETXTBSY`. The install script exits immediately when the binary is
// already present.
function globalSetup() {
  execFileSync(process.execPath, [require.resolve('electron/install.js')], {
    stdio: 'inherit',
  });
}

// Playwright requires the setup function to be the default export.
// oxlint-disable-next-line import/no-default-export
export default globalSetup;
