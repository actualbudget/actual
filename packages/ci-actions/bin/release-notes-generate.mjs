import * as childProcess from 'node:child_process';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { inspect, promisify } from 'node:util';

import matter from 'gray-matter';
import listify from 'listify';

import {
  categoryAutocorrections,
  categoryOrder,
} from '../src/release-notes/util.mjs';

const exec = promisify(childProcess.exec);

const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

const apiResult = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: /* GraphQL */ `
      query GetPRMetadata(
        $name: String!
        $owner: String!
        $headRefName: String!
      ) {
        repository(name: $name, owner: $owner) {
          pullRequests(headRefName: $headRefName, first: 1) {
            edges {
              node {
                number
                headRefName
                body
              }
            }
          }
        }
      }
    `,
    variables: {
      name: repo,
      owner,
      headRefName: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME,
    },
  }),
}).then(res => res.json());

await collapsedLog('API Response', apiResult);

const prData = apiResult.data.repository.pullRequests.edges[0].node;

const version = prData.headRefName.split('/')[1].replace(/^v/, '');
const slug = version.replace(/\./g, '-');
const author = process.env.GITHUB_ACTOR || 'TODO';
const commitMessage = `Generate release notes for v${version}`;

const releaseDateMatch = (prData.body || '').match(
  /<!-- release-date:(\d{4}-\d{2}-\d{2}) -->/,
);
const releaseDate = releaseDateMatch ? releaseDateMatch[1] : 'TODO';

const botName = 'github-actions[bot]';
const botEmail = '41898282+github-actions[bot]@users.noreply.github.com';

await exec(`git config user.name '${botName}'`);
await exec(`git config user.email '${botEmail}'`);

const AUTOGEN_MARKER = '<!-- release-notes:auto-generated -->';

await group('Prepare branch', async () => {
  if (process.env.GITHUB_HEAD_REF) {
    await exec(`git fetch origin ${process.env.GITHUB_HEAD_REF}`, {
      stdio: 'inherit',
    });
    await exec(`git checkout ${process.env.GITHUB_HEAD_REF}`, {
      stdio: 'inherit',
    });
  }

  // the previous generation commit deletes source files from
  // upcoming-release-notes, refetch them so we can regenerate from all of them
  const baseRef = process.env.GITHUB_BASE_REF || 'master';
  await exec(`git fetch origin ${baseRef}`, { stdio: 'inherit' });
  const { stdout: mergeBase } = await exec(
    `git merge-base HEAD origin/${baseRef}`,
  );
  const base = mergeBase.trim();
  console.log(`Restoring upcoming-release-notes from merge-base ${base}`);
  await exec(`git checkout ${base} -- upcoming-release-notes`, {
    stdio: 'inherit',
  });
});

const { notesByCategory, files } = await parseReleaseNotes(
  'upcoming-release-notes',
);
const categorizedNotes = formatNotes(notesByCategory);

await collapsedLog('Release Notes', categorizedNotes);

if (files.length === 0) {
  console.log('No release notes found, nothing to generate');
  process.exit(0);
}

const highlights = '- TODO: Add release highlights';

await group('Generate blog post', async () => {
  const blogPath = join(
    'packages/docs/blog',
    `${releaseDate}-release-${slug}.md`,
  );

  const template = `---
title: Release ${version}
description: New release of Actual.
date: ${releaseDate}T10:00
slug: release-${version}
tags: [announcement, release]
hide_table_of_contents: false
authors: ${author}
---

${highlights}

<!--truncate-->

**Docker Tag: ${version}**

${AUTOGEN_MARKER}
${categorizedNotes}
`;

  let blogContent;
  try {
    const existing = await fs.readFile(blogPath, 'utf-8');
    const idx = existing.indexOf(AUTOGEN_MARKER);
    if (idx === -1) {
      console.log(
        `WARNING: ${blogPath} missing ${AUTOGEN_MARKER}, rewriting from template`,
      );
      blogContent = template;
    } else {
      blogContent =
        existing.slice(0, idx + AUTOGEN_MARKER.length) +
        '\n' +
        categorizedNotes +
        '\n';
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    blogContent = template;
  }

  await fs.writeFile(blogPath, blogContent);
  console.log(`Wrote ${blogPath}`);
});

await group('Update releases.md', async () => {
  const releasesPath = 'packages/docs/docs/releases.md';
  const existing = await fs.readFile(releasesPath, 'utf-8');

  const sectionRe = new RegExp(
    `(^|\\n)## ${escapeRegExp(version)}\\n[\\s\\S]*?(?=\\n## |$)`,
  );
  const match = existing.match(sectionRe);

  let updated;
  if (match) {
    const section = match[0];
    const idx = section.indexOf(AUTOGEN_MARKER);
    if (idx === -1) {
      console.log(
        `WARNING: section for ${version} in ${releasesPath} missing ${AUTOGEN_MARKER}, leaving as-is`,
      );
      updated = existing;
    } else {
      const newSection =
        section.slice(0, idx + AUTOGEN_MARKER.length) + '\n' + categorizedNotes;
      updated = existing.replace(section, newSection);
    }
  } else {
    const newSection = `## ${version}

Release date: ${releaseDate}

${highlights}

**Docker Tag: ${version}**

${AUTOGEN_MARKER}
${categorizedNotes}`;
    updated = existing.replace(
      '# Release Notes\n',
      `# Release Notes\n\n${newSection}\n`,
    );
  }

  await fs.writeFile(releasesPath, updated);
  console.log(`Updated ${releasesPath}`);
});

await group('Remove used release notes', async () => {
  await Promise.all(
    files.map(f => fs.unlink(join('upcoming-release-notes', f))),
  );
});

await group('Commit and push', async () => {
  await exec(
    'git add upcoming-release-notes packages/docs/blog packages/docs/docs/releases.md',
    { stdio: 'inherit' },
  );

  try {
    await exec('git diff --cached --quiet');
    console.log('No changes to commit');
    return;
  } catch {
    // there are staged changes
  }

  await exec(`git commit -m '${commitMessage}'`);
  await exec('git push origin', { stdio: 'inherit' });
});

async function parseReleaseNotes(dir) {
  const files = (await fs.readdir(dir)).filter(f => f.match(/^\d+\.md$/));
  const notes = files.map(async name => {
    const content = await fs.readFile(join(dir, name), 'utf-8');
    const { data, content: body } = matter(content);
    const number = name.replace('.md', '');
    const authors = listify(
      data.authors.map(a => `@${a}`),
      { finalWord: '&' },
    );
    return {
      category: categoryAutocorrections[data.category] ?? data.category,
      value: `- [#${number}](https://github.com/actualbudget/${repo}/pull/${number}) ${body.trim()} — thanks ${authors}`,
    };
  });

  const notesByCategory = (await Promise.all(notes)).reduce(
    (acc, note) => {
      if (!acc[note.category]) {
        console.log(`WARNING: Unrecognized category "${note.category}"`);
        acc[note.category] = [];
      }
      acc[note.category].push(note.value);
      return acc;
    },
    Object.fromEntries(categoryOrder.map(c => [c, []])),
  );

  return { notesByCategory, files };
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatNotes(notes) {
  return Object.entries(notes)
    .filter(([_, values]) => values.length > 0)
    .map(([category, values]) => `#### ${category}\n\n${values.join('\n')}`)
    .join('\n\n');
}

async function collapsedLog(name, value) {
  await group(name, () => {
    if (typeof value === 'string') {
      console.log(value);
    } else {
      console.log(inspect(value, { depth: null }));
    }
  });
}

async function group(name, cb) {
  console.log(`::group::${name}`);
  await cb();
  console.log('::endgroup::');
}
