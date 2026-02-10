#!/usr/bin/env node

import fs from 'fs';

import { Octokit } from '@octokit/rest';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const issueNumber = process.env.GITHUB_EVENT_ISSUE_NUMBER;
const prDetailsJson = process.env.PR_DETAILS;

if (!token || !repo || !issueNumber || !prDetailsJson) {
  console.log('Missing required environment variables');
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

function setOutput(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function checkReleaseNotesExists() {
  try {
    const prDetails = JSON.parse(prDetailsJson);
    if (!prDetails) {
      console.log('No PR details available, skipping file check');
      setOutput('result', 'false');
      return;
    }

    const fileName = `upcoming-release-notes/${prDetails.number}.md`;
    const usedBaseRepoFallback = !prDetails.headRepoFullName;
    const headRepoFullName = prDetails.headRepoFullName || repo;
    const headRef = prDetails.headRef;

    if (!headRepoFullName || !headRef) {
      console.log('Missing head repository or branch details, skipping check');
      setOutput('result', 'false');
      return;
    }

    const [headOwner, headRepoName] = headRepoFullName.split('/');
    if (!headOwner || !headRepoName) {
      console.log('Invalid head repository format, skipping check');
      setOutput('result', 'false');
      return;
    }

    console.log(
      `Checking for file on PR branch: ${headRepoFullName}@${headRef}`,
    );
    if (usedBaseRepoFallback) {
      console.log(
        `Source fork repository is unavailable; checking base repository ${headRepoFullName} with head ref ${headRef}.`,
      );
    }

    // Check if file exists
    try {
      await octokit.rest.repos.getContent({
        owner: headOwner,
        repo: headRepoName,
        path: fileName,
        ref: headRef,
      });

      console.log(
        `Release notes file already exists on PR branch: ${fileName}`,
      );
      setOutput('result', 'true');
    } catch (error) {
      if (error.status === 404) {
        console.log(
          `No existing release notes file found on PR branch: ${fileName}`,
        );
        setOutput('result', 'false');
      } else {
        console.log('Error checking file existence:', error.message);
        setOutput('result', 'false');
      }
    }
  } catch (error) {
    console.log('Error in file existence check:', error.message);
    setOutput('result', 'false');
  }
}

checkReleaseNotesExists().catch(error => {
  console.log('Unhandled error:', error.message);
  setOutput('result', 'false');
  process.exit(1);
});
