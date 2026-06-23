import { existsSync } from 'node:fs';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import { rebuild } from '@electron/rebuild';
import copyFiles from 'copyfiles';
import { Arch } from 'electron-builder';
import type { AfterPackContext } from 'electron-builder';

const NATIVE_MODULES = ['better-sqlite3', 'bcrypt'];

let appxResourcesPromise: Promise<void> | undefined;

function resolveModuleDir(moduleName: string, searchDirs: string[]): string {
  for (const dir of searchDirs) {
    const candidate = path.join(dir, 'node_modules', moduleName);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`beforePackHook: unable to locate ${moduleName}`);
}

function copyAppxResources(): Promise<void> {
  if (!appxResourcesPromise) {
    appxResourcesPromise = new Promise<void>((resolve, reject) => {
      copyFiles(['./appx/**/*', './build'], { error: true }, err =>
        err ? reject(err) : resolve(),
      );
    });
  }
  return appxResourcesPromise;
}

export function nativeBuildDir(context: AfterPackContext): string {
  return path.join(
    context.outDir,
    '.native-build',
    `${context.electronPlatformName}-${Arch[context.arch]}`,
  );
}

const beforePackHook = async (context: AfterPackContext) => {
  const arch: string = Arch[context.arch];
  const packagerDir = context.packager.projectDir;
  const projectRootPath = path.resolve(packagerDir, '..', '..');
  const electronVersion = context.packager.config.electronVersion;

  if (!electronVersion) {
    console.error('beforePackHook: Unable to find electron version.');
    process.exit(1);
  }

  const buildRoot = nativeBuildDir(context);

  try {
    await rm(buildRoot, { recursive: true, force: true });
    await mkdir(path.join(buildRoot, 'node_modules'), { recursive: true });

    for (const moduleName of NATIVE_MODULES) {
      const source = resolveModuleDir(moduleName, [
        packagerDir,
        projectRootPath,
      ]);
      const dest = path.join(buildRoot, 'node_modules', moduleName);
      await cp(source, dest, { recursive: true });
      await rm(path.join(dest, 'build'), { recursive: true, force: true });
    }

    await writeFile(
      path.join(buildRoot, 'package.json'),
      JSON.stringify({
        name: 'actual-native-build',
        version: '0.0.0',
        dependencies: Object.fromEntries(
          NATIVE_MODULES.map(moduleName => [moduleName, '*']),
        ),
      }),
    );

    await rebuild({
      arch,
      buildPath: buildRoot,
      electronVersion,
      force: true,
      projectRootPath,
      onlyModules: NATIVE_MODULES,
    });

    console.info(`Rebuilt ${NATIVE_MODULES.join(', ')} for ${arch}!`);

    if (context.packager.platform.name === 'windows') {
      await copyAppxResources();
    }
  } catch (err) {
    console.error('beforePackHook:', err);
    process.exit(1);
  }
};

// oxlint-disable-next-line import/no-default-export
export default beforePackHook;
