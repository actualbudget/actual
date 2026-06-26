import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { AfterPackContext } from 'electron-builder';

const execFileAsync = promisify(execFile);

const afterSignHook = async (context: AfterPackContext) => {
  if (context.electronPlatformName !== 'darwin' || process.env.CSC_LINK) {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = `${context.appOutDir}/${appName}`;

  await execFileAsync('codesign', [
    '--sign',
    '-',
    '--force',
    '--preserve-metadata=entitlements,requirements,flags,runtime',
    '--deep',
    appPath,
  ]);
};

// oxlint-disable-next-line import/no-default-export
export default afterSignHook;
