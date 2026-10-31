// Generates `docs/_upcoming-release-notes.md` from the repo-root
// `upcoming-release-notes/` directory. These per-PR notes are the changes that
// have been merged but not yet published in a stable release — i.e. what ships
// in the nightly builds. It is imported as a partial into `docs/releases.md`.

import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatNotes,
  parseReleaseNotes,
} from '@actual-app/ci-actions/src/release-notes/util.mjs';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

const notesDir = join(repoRoot, 'upcoming-release-notes');
const outputPath = join(
  repoRoot,
  'packages/docs/docs/_upcoming-release-notes.md',
);

const intro = `:::info

These changes have been merged but are **not yet part of a stable release**. They
ship in the nightly builds — try them via the \`nightly\` Docker image tag, or the
hosted demo at [nightly.actualbudget.org](https://nightly.actualbudget.org).
For changes in stable releases, see below.

:::`;

export async function generateUpcomingReleaseNotes() {
  let content = '{/* No unreleased changes */}';

  // A release tag still contains the notes it shipped with, so they are not
  // upcoming there.
  if (process.env.GITHUB_REF_TYPE === 'tag') {
    console.log('Building a release tag. Generated empty partial.');
  } else {
    const { notesByCategory, files } = await parseReleaseNotes(
      notesDir,
      'actualbudget',
      'actual',
    );

    if (files.length > 0) {
      const body = formatNotes(notesByCategory);
      content = `## Next\n\n${intro}\n\n${body}\n`;
      console.log(
        `Generated ${outputPath} with ${files.length} upcoming release note(s).`,
      );
    } else {
      console.log(`No upcoming release notes found. Generated empty partial.`);
    }
  }

  await fs.writeFile(outputPath, content + '\n');
}
