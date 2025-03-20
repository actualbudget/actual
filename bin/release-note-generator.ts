import { exec } from 'node:child_process';
import { existsSync, writeFile } from 'node:fs';
import { exit } from 'node:process';

import prompts from 'prompts';

async function run() {
  const username = await new Promise<string>(res => {
    // eslint-disable-next-line rulesdir/typography
    exec(`gh api user --jq '.login'`, (error, stdout) => {
      if (error) {
        console.log(
          'To avoid having to enter your username, consider installing the official GitHub CLI (https://github.com/cli/cli) and logging in with `gh auth login`.',
        );
        res('');
      } else {
        res(stdout.trim());
      }
    });
  });

  const result = await prompts([
    {
      name: 'githubUsername',
      message: 'Comma-separated GitHub username(s)',
      type: 'text',
      initial: username,
    },
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
        { title: 'Features', value: 'Features' },
        { title: 'Enhancements', value: 'Enhancements' },
        { title: 'Bugfix', value: 'Bugfix' },
        { title: 'Maintenance', value: 'Maintenance' },
      ],
    },
    {
      name: 'oneLineSummary',
      message: 'Brief Summary',
      type: 'text',
    },
  ]);

  if (
    !result.githubUsername ||
    !result.oneLineSummary ||
    !result.releaseNoteType
  ) {
    console.log('All questions must be answered. Exiting');
    exit(1);
  }

  const fileContents = getFileContents(
    result.releaseNoteType,
    result.githubUsername,
    result.oneLineSummary,
  );

  const prNumber =
    parseInt(result.pullRequestNumber) || (await getNextPrNumber());
  if (prNumber <= 0) {
    console.error('PR number must be a positive integer');
    exit(1);
  }

  const filepath = `./upcoming-release-notes/${prNumber}.md`;
  if (existsSync(filepath)) {
    const { confirm } = await prompts({
      name: 'confirm',
      type: 'confirm',
      message: `This will overwrite the existing release note ${filepath} Are you sure?`,
    });
    if (!confirm) {
      console.log('Exiting');
      exit(1);
    }
  }

  writeFile(filepath, fileContents, err => {
    if (err) {
      console.error('Failed to write release note file:', err);
      exit(1);
    } else {
      console.log(
        `Release note generated successfully: ./upcoming-release-notes/${prNumber}.md`,
      );
    }
  });
}

async function getNextPrNumber(): Promise<number> {
  try {
    const resp = await fetch(
      'https://api.github.com/repos/actualbudget/actual/issues?state=all&per_page=1',
    );
    if (!resp.ok) {
      throw new Error(`API responded with status: ${resp.status}`);
    }
    const ghResponse = await resp.json();
    const latestPrNumber = ghResponse?.[0]?.number;
    if (!latestPrNumber) {
      console.error(
        'Could not find latest issue number in GitHub API response',
        ghResponse,
      );
      exit(1);
    }
    return latestPrNumber + 1;
  } catch (error) {
    console.error('Failed to fetch next PR number:', error);
    exit(1);
  }
}

function getFileContents(type: string, username: string, summary: string) {
  return `---
category: ${type}
authors: [${username}]
---

${summary}
`;
}

run();
