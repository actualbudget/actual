#!/usr/bin/env node

import fs from 'fs';

import { Octokit } from '@octokit/rest';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const issueNumber = process.env.GITHUB_EVENT_ISSUE_NUMBER;

if (!token || !repo || !issueNumber) {
  console.log('Missing required environment variables');
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const octokit = new Octokit({ auth: token });

function setOutput(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function getPRDetails() {
  try {
    console.log(
      `Fetching PR details for ${owner}/${repoName}#${issueNumber}...`,
    );

    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: issueNumber,
    });

    console.log('PR details fetched successfully');
    console.log('- PR Number:', pr.number);
    console.log('- PR Author:', pr.user.login);
    console.log('- PR Title:', pr.title);
    console.log('- Base Branch:', pr.base.ref);
    console.log('- Head Branch:', pr.head.ref);

    // Fetch all changed files to detect docs-only PRs
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo: repoName,
      pull_number: issueNumber,
      per_page: 100,
    });

    const changedFiles = files.map(f => f.filename);
    const isDocsOnly =
      changedFiles.length > 0 &&
      changedFiles.every(file => file.startsWith('packages/docs/'));

    console.log('- Changed Files:', changedFiles.length);
    console.log('- Is Docs Only:', isDocsOnly);

    const result = {
      number: pr.number,
      author: pr.user.login,
      title: pr.title,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
    };

    let eligible = true;
    if (pr.base.ref !== 'master') {
      console.log(
        'PR does not target master branch, skipping release notes generation',
      );
      eligible = false;
    } else if (pr.head.ref.startsWith('release/')) {
      console.log(
        'PR head branch is a release branch, skipping release notes generation',
      );
      eligible = false;
    } else if (isDocsOnly) {
      console.log(
        'PR only changes documentation, skipping release notes generation',
      );
      eligible = false;
    }

    setOutput('result', JSON.stringify(result));
    setOutput('eligible', JSON.stringify(eligible));
  } catch (error) {
    console.log('Error getting PR details:', error.message);
    console.log('Stack:', error.stack);
    setOutput('result', 'null');
    setOutput('eligible', 'false');
    process.exit(1);
  }
}

getPRDetails().catch(error => {
  console.log('Unhandled error:', error.message);
  console.log('Stack:', error.stack);
  setOutput('result', 'null');
  setOutput('eligible', 'false');
  process.exit(1);
});
