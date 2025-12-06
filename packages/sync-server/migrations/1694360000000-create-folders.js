import fs from 'node:fs/promises';

import { config } from '../src/load-config';

async function ensureExists(path) {
  try {
    await fs.mkdir(path);
  } catch (err) {
    if (err.code === 'EEXIST') {
      return null;
    }

    throw err;
  }
}

export const up = async function () {
  await ensureExists(config.get('serverFiles'));
  await ensureExists(config.get('userFiles'));
};

export const down = async function () {
  await fs.rm(config.get('serverFiles'), { recursive: true, force: true });
  await fs.rm(config.get('userFiles'), { recursive: true, force: true });
};
