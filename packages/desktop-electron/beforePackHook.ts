import { rebuild } from '@electron/rebuild';
import { Arch, AfterPackContext } from 'electron-builder';

/* The beforePackHook runs before packing the Electron app for an architecture
We hook in here to build anything architecture dependent - such as beter-sqlite3
To build, we call @electron/rebuild on the better-sqlite3 module */
const beforePackHook = async (context: AfterPackContext) => {
  const arch: string = Arch[context.arch];
  const buildPath = context.packager.projectDir;
  const projectRootPath = buildPath + '/../../';
  const electronVersion = context.packager.config.electronVersion;

  if (!electronVersion) {
    console.error('beforePackHook: Unable to find electron version.');
  }

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
    console.error('beforePackHook:', err);
    process.exit(); // End the process - unsuccessful build
  }
};

// eslint-disable-next-line import/no-unused-modules, import/no-default-export
export default beforePackHook;
