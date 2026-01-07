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

const [owner, repoName] = repo.split('/');
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

    // Get PR info to get head SHA
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: issueNumber,
    });

    const prHeadSha = pr.head.sha;
    console.log(
      `Checking for file on PR branch: ${pr.head.ref} (${prHeadSha})`,
    );

    // Check if file exists
    try {
      await octokit.rest.repos.getContent({
        owner,
        repo: repoName,
        path: fileName,
        ref: prHeadSha,
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

checkReleaseNotesExists();
