// overview:
// A ratchet for the project's "new files must be type-strict" rule (AGENTS.md).
// It counts the tracked TypeScript files that opt out of strict mode via the
// strict-ignore directive and compares that against a committed baseline:
//   - more opted-out files than the baseline  -> fail (a new opt-out crept in)
//   - fewer opted-out files than the baseline -> fail, asking you to lower the
//     baseline so the burn-down can never silently reverse
//   - equal                                   -> pass
//
// Run `yarn check:strict-ignore --update` after legitimately removing directives
// to rewrite the baseline (the number must only ever go down) and commit it.

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Assembled from parts so this file is not itself counted as an opt-out.
const DIRECTIVE = ['@ts-strict', 'ignore'].join('-');

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

const baselinePath = path.join(
  repoRoot,
  'packages',
  'ci-actions',
  'strict-ignore-baseline.json',
);

function countOptedOutFiles(): number {
  // `git ls-files` only lists tracked files, so build artifacts and
  // node_modules are skipped without any extra ignore handling.
  const output = execFileSync('git', ['ls-files', '-z', '*.ts', '*.tsx'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  return output
    .split('\0')
    .filter(Boolean)
    .filter(file =>
      readFileSync(path.join(repoRoot, file), 'utf8').includes(DIRECTIVE),
    ).length;
}

function readBaseline(): number {
  const parsed = JSON.parse(readFileSync(baselinePath, 'utf8'));
  return parsed.count;
}

const current = countOptedOutFiles();

if (process.argv.includes('--update')) {
  writeFileSync(
    baselinePath,
    JSON.stringify({ count: current }, null, 2) + '\n',
  );
  console.log(`Updated strict-ignore baseline to ${current}.`);
  process.exit(0);
}

const baseline = readBaseline();

if (current > baseline) {
  console.error(
    `❌ strict-ignore ratchet: ${current} files opt out of strict mode, ` +
      `up from the baseline of ${baseline}.\n` +
      `New files must be type-strict — remove the strict-ignore directive and ` +
      `fix the types instead (AGENTS.md). The count is only allowed to go down.`,
  );
  process.exit(1);
}

if (current < baseline) {
  console.error(
    `🎉 strict-ignore ratchet: down to ${current} files ` +
      `(baseline ${baseline}). Lock in the progress by running ` +
      `\`yarn check:strict-ignore --update\` and committing the updated baseline.`,
  );
  process.exit(1);
}

console.log(
  `✅ strict-ignore ratchet: ${current} files opt out of strict mode ` +
    `(matches baseline).`,
);
