import { exec } from 'node:child_process';
import { existsSync, writeFile } from 'node:fs';
import { exit } from 'node:process';

import prompts from 'prompts';

async function run() {
  const username = await execAsync(
    "gh api user --jq '.login'",
    'To avoid having to enter your username, consider installing the official GitHub CLI (https://github.com/cli/cli) and logging in with `gh auth login`.',
  );
  const activePr = await getActivePr(username);
  if (activePr) {
    console.log(
      `Found potentially matching PR ${activePr.number}: ${activePr.title}`,
    );
  }

  const branchName = await execAsync('git rev-parse --abbrev-ref HEAD');
  const initialSlug = slugify(activePr?.title ?? branchName ?? '');

  const result = await prompts([
    {
      name: 'githubUsername',
      message: 'Comma-separated GitHub username(s)',
      type: 'text',
      initial: username,
    },
    {
      name: 'filenameSlug',
      message: 'Filename slug (used as upcoming-release-notes/<slug>.md)',
      type: 'text',
      initial: initialSlug,
      validate: value =>
        /^[a-z0-9][a-z0-9-]*$/.test(value)
          ? true
          : 'Use lowercase letters, digits, and dashes only',
    },
    {
      name: 'releaseNoteType',
      message: 'Release Note Type',
      type: 'select',
      choices: [
        { title: '✨ Features', value: 'Features' },
        { title: '👍 Enhancements', value: 'Enhancements' },
        { title: '🐛 Bugfixes', value: 'Bugfixes' },
        { title: '⚙️  Maintenance', value: 'Maintenance' },
      ],
    },
    {
      name: 'oneLineSummary',
      message: 'Brief Summary',
      type: 'text',
      initial: activePr?.title,
    },
  ]);

  if (
    !result.githubUsername ||
    !result.oneLineSummary ||
    !result.releaseNoteType ||
    !result.filenameSlug
  ) {
    console.log('All questions must be answered. Exiting');
    exit(1);
  }

  const fileContents = getFileContents(
    result.releaseNoteType,
    result.githubUsername,
    result.oneLineSummary,
  );

  const filepath = `./upcoming-release-notes/${result.filenameSlug}.md`;
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
      console.log(`Release note generated successfully: ${filepath}`);
    }
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// makes an attempt to find an existing open PR from <username>:<branch>
async function getActivePr(
  username: string,
): Promise<{ number: number; title: string } | undefined> {
  if (!username) {
    return undefined;
  }
  const branchName = await execAsync('git rev-parse --abbrev-ref HEAD');
  if (!branchName) {
    return undefined;
  }
  const forkHead = `${username}:${branchName}`;
  return getPrNumberFromHead(forkHead);
}

async function getPrNumberFromHead(
  head: string,
): Promise<{ number: number; title: string } | undefined> {
  try {
    // head is a weird query parameter in this API call. If nothing matches, it
    // will return as if the head query parameter doesn't exist. To get around
    // this, we make the page size 2 and only return the number if the length.
    const resp = await fetch(
      'https://api.github.com/repos/actualbudget/actual/pulls?state=open&per_page=2&head=' +
        head,
    );
    if (!resp.ok) {
      console.warn('error fetching from github pulls api:', resp.status);
      return undefined;
    }
    const ghResponse = await resp.json();
    if (ghResponse?.length === 1) {
      return ghResponse[0];
    } else {
      return undefined;
    }
  } catch (e) {
    console.warn('error fetching from github pulls api:', e);
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

// simple exec that fails silently and returns an empty string on failure
async function execAsync(cmd: string, errorLog?: string): Promise<string> {
  return new Promise<string>(res => {
    exec(cmd, (error, stdout) => {
      if (error) {
        console.log(errorLog);
        res('');
      } else {
        res(stdout.trim());
      }
    });
  });
}

void run();
