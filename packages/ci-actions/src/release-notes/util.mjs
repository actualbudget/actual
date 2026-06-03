import * as childProcess from 'node:child_process';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import matter from 'gray-matter';
import listify from 'listify';

const execFile = promisify(childProcess.execFile);

export const categoryAutocorrections = {
  Feature: 'Features',
  Enhancement: 'Enhancements',
  Bugfix: 'Bugfixes',
};

export const categoryOrder = [
  'Features',
  'Enhancements',
  'Bugfixes',
  'Maintenance',
];

export async function parseReleaseNotes(dir, owner, repo) {
  const files = (await fs.readdir(dir)).filter(
    f => f.endsWith('.md') && f !== 'README.md',
  );
  const shaToPr = new Map();
  const notes = files.map(async name => {
    const content = await fs.readFile(join(dir, name), 'utf-8');
    const { data, content: body } = matter(content);
    const authors = listify(
      data.authors.map(a => `@${a}`),
      { finalWord: '&' },
    );
    const number = await resolvePrNumber(dir, name, shaToPr, owner, repo);
    const prefix = number
      ? `[#${number}](https://github.com/${owner}/${repo}/pull/${number}) `
      : '';
    return {
      category: categoryAutocorrections[data.category] ?? data.category,
      value: `- ${prefix}${body.trim()} — thanks ${authors}`,
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

async function resolvePrNumber(dir, name, shaToPr, owner, repo) {
  const basename = name.replace(/\.md$/, '');
  if (/^\d+$/.test(basename)) {
    return basename;
  }

  let sha;
  try {
    const { stdout } = await execFile('git', [
      'log',
      '--diff-filter=A',
      '--follow',
      '--format=%H',
      '--',
      join(dir, name),
    ]);
    const lines = stdout.split('\n').filter(Boolean);
    sha = lines[lines.length - 1];
  } catch (e) {
    console.log(`WARNING: failed to find add-commit for ${name}: ${e.message}`);
    return null;
  }
  if (!sha) {
    console.log(`WARNING: no add-commit found for ${name}; skipping PR link`);
    return null;
  }

  if (shaToPr.has(sha)) {
    return shaToPr.get(sha);
  }

  const number = await fetchPrForCommit(sha, owner, repo);
  shaToPr.set(sha, number);
  if (!number) {
    console.log(
      `WARNING: no merged PR found for commit ${sha} (file ${name}); skipping PR link`,
    );
  }
  return number;
}

async function fetchPrForCommit(sha, owner, repo) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/pulls`,
      {
        headers: {
          Authorization: `bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!res.ok) {
      console.log(
        `WARNING: GitHub API returned ${res.status} for commit ${sha}`,
      );
      return null;
    }
    const prs = await res.json();
    const merged = prs.find(p => p.merged_at);
    return merged ? String(merged.number) : null;
  } catch (e) {
    console.log(
      `WARNING: failed to resolve PR for commit ${sha}: ${e.message}`,
    );
    return null;
  }
}

export function formatNotes(notes) {
  return Object.entries(notes)
    .filter(([_, values]) => values.length > 0)
    .map(([category, values]) => `#### ${category}\n\n${values.join('\n')}`)
    .join('\n\n');
}
