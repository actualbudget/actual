import fs from 'node:fs/promises';
import config from '../src/load-config.js';

async function ensureExists(path) {
  try {
    await fs.mkdir(path);
  } catch (err) {
    if (err.code == 'EEXIST') {
      return null;
    }

    throw err;
  }
}

export const up = async function () {
  await ensureExists(config.serverFiles);
  await ensureExists(config.userFiles);
};

export const down = async function () {
  await fs.rm(config.serverFiles, { recursive: true, force: true });
  await fs.rm(config.userFiles, { recursive: true, force: true });
};
