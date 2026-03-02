#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const githubToken = process.env.GITHUB_TOKEN;
const actionsUpdateToken = process.env.ACTIONS_UPDATE_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const issueNumber = process.env.GITHUB_EVENT_ISSUE_NUMBER;
const summaryDataJson = process.env.SUMMARY_DATA;
const category = process.env.CATEGORY;

if (!githubToken || !repo || !issueNumber || !summaryDataJson || !category) {
  console.log('Missing required environment variables');
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const readOctokit = new Octokit({ auth: githubToken });

async function createReleaseNotesFile() {
  try {
    const summaryData = JSON.parse(summaryDataJson);

    console.log('Debug - Category value:', category);
    console.log('Debug - Category type:', typeof category);
    console.log('Debug - Category JSON stringified:', JSON.stringify(category));

    if (!summaryData) {
      console.log('No summary data available, cannot create file');
      return;
    }

    if (!category || category === 'null') {
      console.log('No valid category available, cannot create file');
      return;
    }

    // Create file content - ensure category is not quoted
    const cleanCategory =
      typeof category === 'string'
        ? category.replace(/^["']|["']$/g, '')
        : category;
    console.log('Debug - Clean category:', cleanCategory);

    const fileContent = `---
category: ${cleanCategory}
authors: [${summaryData.author}]
---

${summaryData.summary}
`;

    const fileName = `upcoming-release-notes/${summaryData.prNumber}.md`;

    console.log(`Creating release notes file: ${fileName}`);
    console.log('File content:');
    console.log(fileContent);

    // Get PR info (use GITHUB_TOKEN - has read access in the repo where the workflow runs)
    const { data: pr } = await readOctokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: issueNumber,
    });

    const prBranch = pr.head.ref;
    const headOwner = pr.head.repo.owner.login;
    const headRepo = pr.head.repo.name;
    const headRepoFull = `${headOwner}/${headRepo}`;

    // PR from fork: head repo !== this repo → we must write to the fork; use ACTIONS_UPDATE_TOKEN
    //   (workflow runs in base repo and has the PAT). Same repo (branch PR): use GITHUB_TOKEN.
    // If this workflow runs in a fork (e.g. contributor’s copy), PAT isn’t set; same-repo writes
    // still work via GITHUB_TOKEN.
    const writeToken = headRepoFull !== repo ? actionsUpdateToken : githubToken;
    if (!writeToken) {
      console.log(
        'Cannot write to fork: ACTIONS_UPDATE_TOKEN is required for cross-repo writes and is not available (e.g. workflow running in a fork).',
      );
      process.exit(1);
    }

    console.log(
      `Committing to PR branch: ${headOwner}/${headRepo}:${prBranch}`,
    );

    const writeOctokit = new Octokit({ auth: writeToken });

    // Create the file via GitHub API on the PR branch
    await writeOctokit.rest.repos.createOrUpdateFileContents({
      owner: headOwner,
      repo: headRepo,
      path: fileName,
      message: `Add release notes for PR #${summaryData.prNumber}`,
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
