import { cp, mkdir, readdir } from 'node:fs/promises';
import * as path from 'node:path';

import { Arch } from 'electron-builder';
import type { AfterPackContext } from 'electron-builder';

const NATIVE_MODULES = ['better-sqlite3', 'bcrypt'];

async function findNodeBinaries(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findNodeBinaries(full)));
    } else if (
      entry.name.endsWith('.node') &&
      entry.name !== 'test_extension.node'
    ) {
      found.push(full);
    }
  }

  return found;
}

const afterPackHook = async (context: AfterPackContext) => {
  const modulesRoot = path.join(
    context.outDir,
    '.native-build',
    `${context.electronPlatformName}-${Arch[context.arch]}`,
    'node_modules',
  );
  const unpackedRoot = path.join(
    context.packager.getResourcesDir(context.appOutDir),
    'app.asar.unpacked',
    'node_modules',
  );

  for (const moduleName of NATIVE_MODULES) {
    const binaries = await findNodeBinaries(path.join(modulesRoot, moduleName));

    for (const binary of binaries) {
      const dest = path.join(unpackedRoot, path.relative(modulesRoot, binary));
      await mkdir(path.dirname(dest), { recursive: true });
      await cp(binary, dest);
    }
  }
};

// oxlint-disable-next-line import/no-default-export
export default afterPackHook;
