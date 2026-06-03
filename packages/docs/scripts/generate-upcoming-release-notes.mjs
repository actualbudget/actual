// Generates `docs/upcoming-release-notes.md` from the repo-root
// `upcoming-release-notes/` directory. These per-PR notes are the changes that
// have been merged but not yet published in a stable release — i.e. what ships
// in the nightly/edge builds. The page is regenerated on every docs build, so
// it always reflects the current set of unreleased changes.
//
// This runs before `docusaurus start` / `docusaurus build` (see package.json).

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
  'packages/docs/docs/upcoming-release-notes.md',
);

const intro = `:::info

These changes have been merged but are **not yet part of a stable release**. They
ship in the nightly/edge builds — try them via the \`edge\` (or \`nightly\`) Docker
image tag, or the hosted demo at [edge.actualbudget.org](https://edge.actualbudget.org).
For changes in stable releases, see the [Release Notes](/docs/releases).

:::`;

const header = `---
title: Upcoming Release
description: Release notes for changes that are merged but not yet released, available in the nightly/edge builds.
sidebar_label: Upcoming Release
---

<!-- This page is auto-generated from the upcoming-release-notes/ directory. Do not edit it by hand. -->

# Upcoming Release

${intro}`;

const { notesByCategory, files } = await parseReleaseNotes(notesDir, 'actual');

const body =
  files.length === 0
    ? `There are no unreleased changes right now — everything has shipped in a stable [release](/docs/releases).`
    : formatNotes(notesByCategory);

await fs.writeFile(outputPath, `${header}\n\n${body}\n`);

console.log(
  `Generated ${outputPath} from ${files.length} upcoming release note(s).`,
);
