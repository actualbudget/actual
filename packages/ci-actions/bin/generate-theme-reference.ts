import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const sourcePath = join(
  repoRoot,
  'packages/component-library/src/themes/source/reference.ts',
);
const outputPath = join(
  repoRoot,
  'packages/docs/docs/custom-themes-variables.md',
);

const source: unknown = await import(pathToFileURL(sourcePath).href);
if (
  typeof source !== 'object' ||
  source == null ||
  !('buildThemeReference' in source) ||
  typeof source.buildThemeReference !== 'function'
) {
  throw new Error(`${sourcePath} does not export buildThemeReference`);
}

const reference: unknown = source.buildThemeReference();
if (typeof reference !== 'string') {
  throw new Error('buildThemeReference did not return the page text');
}

await fs.writeFile(outputPath, reference);
console.log(`Generated ${outputPath}.`);
