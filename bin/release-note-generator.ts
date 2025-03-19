import { writeFile } from 'node:fs';

import prompts from 'prompts';

async function run() {
  const result = await prompts([
    {
      name: 'pullRequestNumber',
      message: 'Existing PR number (if applicable)',
      type: 'number',
    },
    {
      name: 'releaseNoteType',
      message: 'Release Note Type',
      type: 'select',
      choices: [
        { title: 'Features' },
        { title: 'Enhancements' },
        { title: 'Bugfix' },
        { title: 'Maintenance' },
      ],
    },
    {
      name: 'oneLineSummary',
      message: 'Brief Summary',
      type: 'text',
    },
    {
      name: 'githubUsername',
      message: 'Comma-separted GitHub username(s)',
      type: 'text',
    },
  ]);

  const fileContents = getFileContents(
    result.releaseNoteType,
    result.githubUsername,
    result.oneLineSummary,
  );

  const prNumber = result.pullRequestNumber || (await getNextPrNumber());

  writeFile(`./upcoming-release-notes/${prNumber}.md`, fileContents, err => {
    if (err) {
      console.error(err);
    }
  });
}

async function getNextPrNumber(): Promise<string> {
  const resp = await fetch(
    'https://internal.floralily.dev/next-pr-number-api/?owner=actualbudget&name=actual',
  );
  return await resp.text();
}

function getFileContents(type: string, username: string, summary: string) {
  return `---
category: ${type},
authors: [${username}]
---

${summary}
`;
}

run();
