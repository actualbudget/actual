import { rebuild } from '@electron/rebuild';
import { Arch, AfterPackContext } from 'electron-builder';

const beforePackHook = async (context: AfterPackContext) => {
  const arch: string = Arch[context.arch];
  const buildPath = context.packager.projectDir;
  const projectRootPath = buildPath + '/../../';
  const electronVersion = context.packager.config.electronVersion;
  try {
    await rebuild({
      arch,
      buildPath,
      electronVersion,
      force: true,
      projectRootPath,
      onlyModules: ['better-sqlite3'],
    });

    console.info(`Rebuilt better-sqlite3 with ${arch}!`);
  } catch (err) {
    console.error('beforePackHook failed', err);
    process.exit(); // End the process - unsuccessful build
  }
};

// eslint-disable-next-line import/no-unused-modules, import/no-default-export
export default beforePackHook;
