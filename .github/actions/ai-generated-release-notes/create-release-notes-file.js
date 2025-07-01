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

${summaryData.summary}`;

    const fileName = `upcoming-release-notes/${summaryData.prNumber}.md`;

    console.log(`Creating release notes file: ${fileName}`);
    console.log('File content:');
    console.log(fileContent);

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
      message: `Add release notes for PR #${summaryData.prNumber}`,
      content: Buffer.from(`${fileContent}\n\n`).toString('base64'),
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

createReleaseNotesFile();
