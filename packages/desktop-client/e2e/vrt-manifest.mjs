import fs from 'node:fs';
import path from 'node:path';

const pkgRoot = path.join(import.meta.dirname, '..');

/**
 * Aligns with Playwright TestInfoImpl anonymous screenshot indexing.
 * `testInfo.snapshotPath('', { kind: 'screenshot' })` does not advance the counter.
 *
 * @param {import('@playwright/test').TestInfo} testInfo
 */
function absolutePathForLastAnonymousScreenshot(testInfo) {
  const last = testInfo._snapshotNames.lastAnonymousSnapshotIndex;
  if (last < 1) {
    throw new Error('No anonymous screenshot has been recorded yet');
  }
  testInfo._snapshotNames.lastAnonymousSnapshotIndex = last - 1;
  try {
    return testInfo._resolveSnapshotPaths(
      'screenshot',
      '',
      'dontUpdateSnapshotIndex',
      undefined,
    ).absoluteSnapshotPath;
  } finally {
    testInfo._snapshotNames.lastAnonymousSnapshotIndex = last;
  }
}

/**
 * Append a manifest line for the most recent anonymous screenshot (VRT theme flow).
 *
 * @param {import('@playwright/test').TestInfo} testInfo
 */
export function appendVrtSnapshotManifestLine(testInfo) {
  if (!process.env.VRT) return;
  const absolutePath = absolutePathForLastAnonymousScreenshot(testInfo);
  const manifestDir =
    process.env.VRT_SNAPSHOT_MANIFEST_DIR ??
    path.join(import.meta.dirname, '.vrt-manifest');
  fs.mkdirSync(manifestDir, { recursive: true });
  const rel = path.relative(pkgRoot, absolutePath).split(path.sep).join('/');
  const file = path.join(manifestDir, `parallel-${testInfo.parallelIndex}.txt`);
  fs.appendFileSync(file, `${rel}\n`, 'utf8');
}
