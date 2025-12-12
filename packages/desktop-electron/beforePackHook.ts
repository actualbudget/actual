import { rebuild } from '@electron/rebuild';
import copyFiles from 'copyfiles';
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
    process.exit(); // End the process - electron version is required
  }

  try {
    await rebuild({
      arch,
      buildPath,
      electronVersion,
      force: true,
      projectRootPath,
      onlyModules: ['better-sqlite3', 'bcrypt'],
    });

    console.info(`Rebuilt better-sqlite3 and bcrypt with ${arch}!`);

    if (context.packager.platform.name === 'windows') {
      console.info(`Windows build - copying appx files...`);

      await new Promise(resolve =>
        copyFiles(['./appx/**/*', './build'], { error: true }, resolve),
      );

      console.info(`Copied appx files!`);
    }
  } catch (err) {
    console.error('beforePackHook:', err);
    process.exit(); // End the process - unsuccessful build
  }
};

// oxlint-disable-next-line import/no-default-export
export default beforePackHook;
