#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const issueNumber = process.env.GITHUB_EVENT_ISSUE_NUMBER;
const summaryDataJson = process.env.SUMMARY_DATA;
const category = process.env.CATEGORY;

if (!token || !repo || !issueNumber || !summaryDataJson || !category) {
  console.log('Missing required environment variables');
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const octokit = new Octokit({ auth: token });

const VALID_CATEGORIES = [
  'Features',
  'Bugfixes',
  'Enhancements',
  'Maintenance',
];
const GITHUB_USERNAME_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

async function createReleaseNotesFile() {
  try {
    const summaryData = JSON.parse(summaryDataJson);

    if (!summaryData) {
      console.log('No summary data available, cannot create file');
      return;
    }

    if (!category || category === 'null') {
      console.log('No valid category available, cannot create file');
      return;
    }

    // Normalize category - strip surrounding quotes and validate against allow-list
    const cleanCategory =
      typeof category === 'string'
        ? category.replace(/^["']|["']$/g, '')
        : category;

    if (!VALID_CATEGORIES.includes(cleanCategory)) {
      console.log(
        `Invalid category "${cleanCategory}". Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      );
      return;
    }

    // Validate author is a plausible GitHub username
    const author = String(summaryData.author || '');
    if (!GITHUB_USERNAME_RE.test(author)) {
      console.log(
        `Invalid author "${author}", aborting release notes creation`,
      );
      return;
    }

    // Normalize summary: collapse whitespace to a single line so it cannot
    // introduce extra YAML frontmatter or break the markdown structure.
    const cleanSummary = String(summaryData.summary || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanSummary) {
      console.log('Empty summary, aborting release notes creation');
      return;
    }

    // Validate PR number - must be a positive integer. The value comes from
    // the GitHub API, but we harden it because it's used to build a file path
    // and a commit message.
    const validatedPrNumber = Number(summaryData.prNumber);
    if (!Number.isInteger(validatedPrNumber) || validatedPrNumber <= 0) {
      console.log(
        `Invalid PR number "${summaryData.prNumber}", aborting release notes creation`,
      );
      return;
    }

    const fileContent = `---
category: ${cleanCategory}
authors: [${author}]
---

${cleanSummary}
`;

    const fileName = `upcoming-release-notes/${validatedPrNumber}.md`;

    console.log(
      `Creating release notes file: ${fileName} (category: ${cleanCategory}, author: ${author})`,
    );

    // Get PR info
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: issueNumber,
    });

    const prBranch = pr.head.ref;
    const headOwner = pr.head.repo.owner.login;
    const headRepo = pr.head.repo.name;

    console.log(
      `Committing to PR branch: ${headOwner}/${headRepo}:${prBranch}`,
    );

    // Create the file via GitHub API on the PR branch
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: headOwner,
      repo: headRepo,
      path: fileName,
      message: `Add release notes for PR #${validatedPrNumber}`,
      content: Buffer.from(fileContent).toString('base64'),
      branch: prBranch,
      committer: {
        name: 'github-actions[bot]',
        email: 'github-actions[bot]@users.noreply.github.com',
      },
      author: {
        name: 'github-actions[bot]',
        email: 'github-actions[bot]@users.noreply.github.com',
      },
    });

    console.log(`✅ Successfully created release notes file: ${fileName}`);
  } catch (error) {
    console.log('Error creating release notes file:', error.message);
  }
}

void createReleaseNotesFile();
