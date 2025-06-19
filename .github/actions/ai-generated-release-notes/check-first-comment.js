#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import fs from 'fs';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const issueNumber = process.env.GITHUB_EVENT_ISSUE_NUMBER;
const commentId = process.env.GITHUB_EVENT_COMMENT_ID;

if (!token || !repo || !issueNumber || !commentId) {
  console.log('Missing required environment variables');
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const octokit = new Octokit({ auth: token });

function setOutput(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function checkFirstComment() {
  try {
    console.log('Fetching comments with Octokit...');

    // Get all comments with automatic pagination
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo: repoName,
      issue_number: issueNumber,
    });

    console.log(`Total comments found: ${comments.length}`);

    // Filter for CodeRabbit summary comments (containing the specific marker)
    const coderabbitSummaryComments = comments.filter(comment => {
      const isCodeRabbit = comment.user.login === 'coderabbitai[bot]';
      const hasSummaryMarker = comment.body.includes(
        '<!-- This is an auto-generated comment: summarize by coderabbit.ai -->',
      );

      if (isCodeRabbit) {
        console.log(
          `CodeRabbit comment found (ID: ${comment.id}), has summary marker: ${hasSummaryMarker}`,
        );
      }

      return isCodeRabbit && hasSummaryMarker;
    });

    const isFirstSummaryComment =
      coderabbitSummaryComments.length === 1 &&
      coderabbitSummaryComments[0].id == commentId;

    console.log(
      `CodeRabbit summary comments found: ${coderabbitSummaryComments.length}`,
    );
    console.log(`Current comment ID: ${commentId}`);
    console.log(`Is first summary comment: ${isFirstSummaryComment}`);
    setOutput('result', isFirstSummaryComment);
  } catch (error) {
    console.log('Error checking CodeRabbit comment:', error.message);
    console.log('Stack:', error.stack);
    setOutput('result', 'false');
    process.exit(1);
  }
}

checkFirstComment().catch(error => {
  console.log('Unhandled error:', error.message);
  console.log('Stack:', error.stack);
  setOutput('result', 'false');
  process.exit(1);
});
