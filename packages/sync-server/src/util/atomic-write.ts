import fs from 'node:fs/promises';
import { dirname, isAbsolute, sep } from 'node:path';

let tempFileCounter = 0;

// Follows symlinks, including dangling ones, so the rename replaces the
// link's target rather than the link.
async function resolveTarget(filepath: string): Promise<string> {
  try {
    return await fs.realpath(filepath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
  const link = await fs.readlink(filepath).catch(() => null);
  if (link === null) {
    return filepath;
  }
  // Not path.resolve, which collapses `..` before symlinked directories are
  // followed.
  return resolveTarget(
    isAbsolute(link) ? link : dirname(filepath) + sep + link,
  );
}

// Writes a temp file and renames it over the target, so a write that fails or
// is killed partway leaves the original file intact.
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
    if (mode !== undefined) {
      // Restore bits the umask stripped. Best-effort, as some
      // filesystems refuse chmod.
      await fs.chmod(tmpPath, mode).catch(() => undefined);
    }
    await fs.rename(tmpPath, target);
  } catch (err) {
    await fs.rm(tmpPath, { force: true }).catch(() => undefined);
    throw err;
  }
}
