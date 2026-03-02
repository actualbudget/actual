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

    const result = {
      number: pr.number,
      author: pr.user.login,
      title: pr.title,
      baseBranch: pr.base.ref,
    };

    setOutput('result', JSON.stringify(result));
  } catch (error) {
    console.log('Error getting PR details:', error.message);
    console.log('Stack:', error.stack);
    setOutput('result', 'null');
    process.exit(1);
  }
}

getPRDetails().catch(error => {
  console.log('Unhandled error:', error.message);
  console.log('Stack:', error.stack);
  setOutput('result', 'null');
  process.exit(1);
});
