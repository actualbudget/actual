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
  // upcoming-release-notes, rebase it out so we can regenerate from all of them
  const { stdout: commitHash } = await exec(
    `git log --grep='${commitMessage}' --format=%H -1`,
  );
  const hash = commitHash.trim();
  if (hash) {
    console.log(`Dropping previous release notes commit ${hash}`);
    await exec(`git rebase --onto ${hash}~1 ${hash}`, {
      stdio: 'inherit',
    });
  }
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

  const blogContent = `---
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

${categorizedNotes}
`;

  await fs.writeFile(blogPath, blogContent);
  console.log(`Wrote ${blogPath}`);
});

await group('Update releases.md', async () => {
  const releasesPath = 'packages/docs/docs/releases.md';
  const existing = await fs.readFile(releasesPath, 'utf-8');

  const newSection = `## ${version}

Release date: ${releaseDate}

${highlights}

**Docker Tag: ${version}**

${categorizedNotes}`;

  const updated = existing.replace(
    '# Release Notes\n',
    `# Release Notes\n\n${newSection}\n`,
  );

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
  await exec(`git commit -m '${commitMessage}'`);
  await exec('git push --force-with-lease origin', { stdio: 'inherit' });
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
