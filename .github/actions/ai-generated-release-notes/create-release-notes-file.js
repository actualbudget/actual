#!/usr/bin/env node

import * as core from '@actions/core';
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

    console.log('Summary data:', summaryData);

    if (!summaryData) {
      console.log('No summary data available, cannot create file');
      core.setOutput('status', 'skipped');
      return;
    }

    console.log('Category value:', category);
    console.log('Category type:', typeof category);
    console.log('Category JSON stringified:', JSON.stringify(category));

    if (!category || category === 'null') {
      console.log('No valid category available, cannot create file');
      core.setOutput('status', 'skipped');
      return;
    }

    // Create file content - ensure category is not quoted
    const cleanCategory =
      typeof category === 'string'
        ? category.replace(/^["']|["']$/g, '')
        : category;
    console.log('Clean category:', cleanCategory);

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

    // Check if the head repo still exists (can be null if fork was deleted)
    if (!pr.head.repo) {
      console.log('⚠️ Cannot create file - source repository has been deleted');
      console.log('Please create the release notes file manually.');
      core.setOutput('status', 'repo_deleted');
      return;
    }

    const prBranch = pr.head.ref;
    const headOwner = pr.head.repo.owner.login;
    const headRepo = pr.head.repo.name;
    const isFork = pr.head.repo.fork;

    console.log(
      `Attempting to commit to ${isFork ? 'fork' : 'branch'}: ${headOwner}/${headRepo}:${prBranch}`,
    );

    // Attempt to create the file via GitHub API on the PR branch
    // This will succeed for:
    // - PRs from branches in the main repo
    // - PRs from forks where the PAT has sufficient permissions
    try {
      await octokit.rest.repos.createOrUpdateFileContents({
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
      core.setOutput('status', 'created');
    } catch (commitError) {
      // Handle permission errors gracefully (403 Forbidden, 404 Not Found)
      if (commitError.status === 403 || commitError.status === 404) {
        console.log(
          `⚠️ Cannot commit to ${isFork ? 'fork' : 'repository'} (${commitError.status} ${commitError.message})`,
        );
        console.log(
          'This typically happens when the action does not have write access to the fork.',
        );
        console.log(
          'The contributor can add the release notes file manually, or a maintainer can add it.',
        );
        core.setOutput('status', 'manual_required');
        return;
      }
      // Re-throw unexpected errors
      throw commitError;
    }
  } catch (error) {
    console.log('Error creating release notes file:', error.message);
    process.exit(1);
  }
}

createReleaseNotesFile();
