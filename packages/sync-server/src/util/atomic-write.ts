import fs from 'node:fs/promises';
import { dirname, isAbsolute, sep } from 'node:path';

let tempFileCounter = 0;

// Follows symlinks, including one whose target doesn't exist yet, so the
// rename replaces the target and leaves the link in place.
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
  // Not path.resolve: it would collapse `..` before the filesystem follows
  // any symlinked directories.
  return resolveTarget(
    isAbsolute(link) ? link : dirname(filepath) + sep + link,
  );
}

// Writes to a temp file next to the target and renames it into place, so an
// interrupted write never leaves a partially written file behind.
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
      // The umask can strip bits at creation. Best-effort, as some
      // filesystems refuse chmod.
      await fs.chmod(tmpPath, mode).catch(() => undefined);
    }
    await fs.rename(tmpPath, target);
  } catch (err) {
    await fs.rm(tmpPath, { force: true }).catch(() => undefined);
    throw err;
  }
}
