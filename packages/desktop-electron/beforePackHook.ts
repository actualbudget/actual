import { rebuild } from '@electron/rebuild';
import copyFiles from 'copyfiles';
import { Arch } from 'electron-builder';
import type { AfterPackContext } from 'electron-builder';

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
    process.exit(1); // End the process - electron version is required
  }

  // gyp always compiles with CC_target/CXX_target when they are set, so they
  // must only point at the cross-compiler while building for a foreign
  // architecture — leaving them set would cross-compile the host-arch pass too.
  if (process.platform === 'linux' && arch === 'arm64') {
    process.env.CC_target = 'aarch64-linux-gnu-gcc';
    process.env.CXX_target = 'aarch64-linux-gnu-g++';
  } else {
    delete process.env.CC_target;
    delete process.env.CXX_target;
  }

  try {
    await rebuild({
      arch,
      buildPath,
      electronVersion,
      force: true,
      projectRootPath,
      onlyModules: ['better-sqlite3', 'bcrypt', 'argon2'],
    });

    console.info(`Rebuilt better-sqlite3, bcrypt, and argon2 with ${arch}!`);

    if (context.packager.platform.name === 'windows') {
      console.info(`Windows build - copying appx files...`);

      await new Promise(resolve =>
        copyFiles(['./appx/**/*', './build'], { error: true }, resolve),
      );

      console.info(`Copied appx files!`);
    }
  } catch (err) {
    console.error('beforePackHook:', err);
    process.exit(1); // End the process - unsuccessful build
  }
};

// oxlint-disable-next-line import/no-default-export
export default beforePackHook;
