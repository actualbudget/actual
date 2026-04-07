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

await setOutput('pr_number', prData.number);
const version = prData.headRefName.split('/')[1];

const { notesByCategory, files } = await parseReleaseNotes(
  'upcoming-release-notes',
);
const notes = printNotes(notesByCategory);

await collapsedLog('Release Notes', notes);

await setOutput(
  'comment',
  `<!-- auto-generated-release-notes -->\nHere are the automatically generated release notes!\n\n~~~markdown\n${notes}\n~~~`,
);

if (files.length === 0) {
  console.log('No release notes found, no cleanup needed');
  process.exit(0);
}

await group('Remove used release notes', async () => {
  if (process.env.GITHUB_HEAD_REF) {
    await exec(`git fetch origin ${process.env.GITHUB_HEAD_REF}`, {
      stdio: 'inherit',
    });
    await exec(`git checkout ${process.env.GITHUB_HEAD_REF}`, {
      stdio: 'inherit',
    });
  }
  await Promise.all(
    files.map(f => fs.unlink(join('upcoming-release-notes', f))),
  );
});

await group('Commit and push', async () => {
  await exec('git add upcoming-release-notes', { stdio: 'inherit' });
  const name = 'github-actions[bot]';
  const email = '41898282+github-actions[bot]@users.noreply.github.com';
  await exec("git commit -m 'Remove used release notes'", {
    stdio: 'inherit',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: name,
      GIT_COMMITTER_NAME: name,
      GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_EMAIL: email,
    },
  });
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

function printNotes(notes) {
  const printedNotes = Object.entries(notes)
    .filter(([_, values]) => values.length > 0)
    .map(([category, values]) => `#### ${category}\n\n${values.join('\n')}`);
  return `Version: ${version}\n\n${printedNotes.join('\n\n')}`;
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

async function setOutput(name, value) {
  const delimiter = Math.random().toString(36).slice(2);
  await fs.appendFile(
    process.env.GITHUB_OUTPUT,
    `\n${name}<<${delimiter}\n${value}\n${delimiter}\n`,
  );
}
