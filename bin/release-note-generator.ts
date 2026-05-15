import { exec } from 'node:child_process';
import { existsSync, writeFile } from 'node:fs';
import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';

import prompts from 'prompts';

type ReleaseNoteType = 'Features' | 'Enhancements' | 'Bugfixes' | 'Maintenance';

const VALID_TYPES: ReleaseNoteType[] = [
  'Features',
  'Enhancements',
  'Bugfixes',
  'Maintenance',
];

const HELP_TEXT = `Generate an upcoming release note file.

Usage:
  yarn generate:release-notes [options]

Options:
  --pr <number>          Pull request number
  --type <type>          Release note category. One of: ${VALID_TYPES.join(', ')}
  --summary <text>       One-line summary
  --authors <list>       Comma-separated GitHub username(s)
  --force                Overwrite the release note file if it already exists
  --non-interactive      Fail instead of prompting when values are missing
  -h, --help             Show this help

When all of --pr, --type, --summary, and --authors are supplied, the script
runs non-interactively and is safe to invoke from automation (e.g. LLM agents
or CI). Missing values fall back to interactive prompts unless
--non-interactive is set.

Examples:
  yarn generate:release-notes \\
    --pr 1234 --type Bugfixes --authors alice \\
    --summary "Fix crash when opening the budget"

  yarn generate:release-notes --pr 1234 --type Features \\
    --authors alice,bob --summary "Add new report" --force
`;

type CliOptions = {
  pr?: number;
  type?: ReleaseNoteType;
  summary?: string;
  authors?: string;
  force: boolean;
  nonInteractive: boolean;
};

function parseCliOptions(): CliOptions {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv.slice(2),
      options: {
        pr: { type: 'string' },
        type: { type: 'string' },
        summary: { type: 'string' },
        authors: { type: 'string' },
        force: { type: 'boolean', default: false },
        'non-interactive': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    console.error('\n' + HELP_TEXT);
    exit(1);
  }

  if (parsed.values.help) {
    console.log(HELP_TEXT);
    exit(0);
  }

  let prNumber: number | undefined;
  if (parsed.values.pr != null) {
    const n = Number(parsed.values.pr);
    if (!Number.isInteger(n) || n <= 0) {
      console.error(`Invalid --pr value: ${parsed.values.pr}`);
      exit(1);
    }
    prNumber = n;
  }

  let type: ReleaseNoteType | undefined;
  if (parsed.values.type != null) {
    const candidate = VALID_TYPES.find(
      t => t.toLowerCase() === String(parsed.values.type).toLowerCase(),
    );
    if (!candidate) {
      console.error(
        `Invalid --type value: ${parsed.values.type}. Must be one of: ${VALID_TYPES.join(', ')}`,
      );
      exit(1);
    }
    type = candidate;
  }

  return {
    pr: prNumber,
    type,
    summary: parsed.values.summary,
    authors: parsed.values.authors,
    force: Boolean(parsed.values.force),
    nonInteractive: Boolean(parsed.values['non-interactive']),
  };
}

async function run() {
  const cli = parseCliOptions();

  const allProvided =
    cli.pr != null &&
    cli.type != null &&
    cli.summary != null &&
    cli.authors != null;

  if (cli.nonInteractive && !allProvided) {
    console.error(
      '--non-interactive requires --pr, --type, --summary, and --authors to all be provided.',
    );
    exit(1);
  }

  let githubUsername: string | undefined = cli.authors;
  let pullRequestNumber: number | undefined = cli.pr;
  let releaseNoteType: ReleaseNoteType | undefined = cli.type;
  let oneLineSummary: string | undefined = cli.summary;

  if (!allProvided) {
    const detectedUsername = await execAsync(
      "gh api user --jq '.login'",
      'To avoid having to enter your username, consider installing the official GitHub CLI (https://github.com/cli/cli) and logging in with `gh auth login`.',
    );
    const activePr =
      cli.pr == null ? await getActivePr(detectedUsername) : undefined;
    if (activePr) {
      console.log(
        `Found potentially matching PR ${activePr.number}: ${activePr.title}`,
      );
    }
    const initialPrNumber =
      cli.pr ?? activePr?.number ?? (await getNextPrNumber());

    const questions: prompts.PromptObject[] = [];
    if (cli.authors == null) {
      questions.push({
        name: 'githubUsername',
        message: 'Comma-separated GitHub username(s)',
        type: 'text',
        initial: detectedUsername,
      });
    }
    if (cli.pr == null) {
      questions.push({
        name: 'pullRequestNumber',
        message: 'PR Number',
        type: 'number',
        initial: initialPrNumber,
      });
    }
    if (cli.type == null) {
      questions.push({
        name: 'releaseNoteType',
        message: 'Release Note Type',
        type: 'select',
        choices: [
          { title: '✨ Features', value: 'Features' },
          { title: '👍 Enhancements', value: 'Enhancements' },
          { title: '🐛 Bugfixes', value: 'Bugfixes' },
          { title: '⚙️  Maintenance', value: 'Maintenance' },
        ],
      });
    }
    if (cli.summary == null) {
      questions.push({
        name: 'oneLineSummary',
        message: 'Brief Summary',
        type: 'text',
        initial: activePr?.title,
      });
    }

    const result: Record<string, unknown> = await prompts(questions);

    if (typeof result.githubUsername === 'string') {
      githubUsername = result.githubUsername;
    }
    if (typeof result.pullRequestNumber === 'number') {
      pullRequestNumber = result.pullRequestNumber;
    }
    if (typeof result.releaseNoteType === 'string') {
      const matched = VALID_TYPES.find(t => t === result.releaseNoteType);
      if (matched) {
        releaseNoteType = matched;
      }
    }
    if (typeof result.oneLineSummary === 'string') {
      oneLineSummary = result.oneLineSummary;
    }
  }

  if (
    !githubUsername ||
    !oneLineSummary ||
    !releaseNoteType ||
    !pullRequestNumber
  ) {
    console.log('All questions must be answered. Exiting');
    exit(1);
  }

  const fileContents = getFileContents(
    releaseNoteType,
    githubUsername,
    oneLineSummary,
  );

  const filepath = `./upcoming-release-notes/${pullRequestNumber}.md`;
  if (existsSync(filepath) && !cli.force) {
    if (cli.nonInteractive) {
      console.error(
        `Release note ${filepath} already exists. Pass --force to overwrite.`,
      );
      exit(1);
    }
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
