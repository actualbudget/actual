import fs from 'node:fs/promises';

let tempFileCounter = 0;

// Follows a symlinked file so the rename replaces its target, not the link.
async function resolveTarget(filepath: string): Promise<string> {
  try {
    return await fs.realpath(filepath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return filepath;
    }
    throw err;
  }
}

// Writes to a temp file next to the target and renames it into place, so a
// concurrent reader sees either the old or the new contents in full.
export async function atomicWriteFile(
  filepath: string,
  contents: string | NodeJS.ArrayBufferView,
): Promise<void> {
  const target = await resolveTarget(filepath);
  const tmpPath = `${target}.${process.pid}.${tempFileCounter++}.tmp`;
  const mode = await fs.stat(target).then(
    stats => stats.mode & 0o777,
    () => undefined,
  );

  try {
    await fs.writeFile(tmpPath, contents, { flush: true, mode });
    await fs.rename(tmpPath, target);
  } catch (err) {
    await fs.rm(tmpPath, { force: true }).catch(() => undefined);
    throw err;
  }
}
