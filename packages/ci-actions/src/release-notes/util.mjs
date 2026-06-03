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
  const notes = files.map(async name => {
    const content = await fs.readFile(join(dir, name), 'utf-8');
    const { data, content: body } = matter(content);
    const authors = listify(
      data.authors.map(a => `@${a}`),
      { finalWord: '&' },
    );
    const number = await resolvePrNumber(dir, name);
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

async function resolvePrNumber(dir, name) {
  const basename = name.replace(/\.md$/, '');
  if (/^\d+$/.test(basename)) {
    return basename;
  }

  let subject;
  try {
    const { stdout } = await execFile('git', [
      'log',
      '-1',
      '--format=%s',
      '--',
      join(dir, name),
    ]);
    subject = stdout.trim();
  } catch (e) {
    console.log(
      `WARNING: failed to read commit subject for ${name}: ${e.message}`,
    );
    return null;
  }

  // GitHub's squash-merge UI appends "(#NNNN)" to every commit subject,
  // so we can recover the PR number without touching the network.
  const match = subject.match(/\(#(\d+)\)\s*$/);
  if (!match) {
    console.log(
      `WARNING: no "(#N)" suffix in commit subject for ${name}; skipping PR link`,
    );
    return null;
  }
  return match[1];
}

export function formatNotes(notes) {
  return Object.entries(notes)
    .filter(([_, values]) => values.length > 0)
    .map(([category, values]) => `#### ${category}\n\n${values.join('\n')}`)
    .join('\n\n');
}
