#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const issueNumber = process.env.GITHUB_EVENT_ISSUE_NUMBER;
const summaryDataJson = process.env.SUMMARY_DATA;
const category = process.env.CATEGORY;
const fileCreationStatus = process.env.FILE_CREATION_STATUS;

if (!token || !repo || !issueNumber || !summaryDataJson || !category) {
  console.log('Missing required environment variables');
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const octokit = new Octokit({ auth: token });

async function commentOnPR() {
  try {
    const summaryData = JSON.parse(summaryDataJson);

    if (!summaryData) {
      console.log('No summary data available, skipping comment');
      return;
    }

    if (!category || category === 'null') {
      console.log('No valid category available, skipping comment');
      return;
    }

    // Clean category for display
    const cleanCategory =
      typeof category === 'string'
        ? category.replace(/^["']|["']$/g, '')
        : category;

    // Get PR info for the file URL
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: issueNumber,
    });

    // Handle case where repo was deleted (pr.head.repo will be null)
    const headOwner = pr.head.repo?.owner.login || summaryData.author;
    const headRepo = pr.head.repo?.name || repoName;
    const prBranch = pr.head.ref;
    const fileName = `upcoming-release-notes/${summaryData.prNumber}.md`;
    const fileUrl = pr.head.repo
      ? `https://github.com/${headOwner}/${headRepo}/blob/${prBranch}/${fileName}`
      : null;

    const fileContent = `---
category: ${cleanCategory}
authors: [${summaryData.author}]
---

${summaryData.summary}
`;

    let commentBody = ['🤖 **Auto-generated Release Notes**', ''];

    // Determine message based on file creation status
    if (fileCreationStatus === 'created') {
      // File was successfully created and committed
      commentBody = commentBody.concat([
        `Hey @${summaryData.author}! I've automatically created a release notes file based on CodeRabbit's analysis:`,
        '',
        `**Category:** ${cleanCategory}`,
        `**Summary:** ${summaryData.summary}`,
        `**File:** [${fileName}](${fileUrl})`,
        '',
        'The release notes file has been committed to your branch. You can edit it if needed before merging.',
      ]);
    } else if (fileCreationStatus === 'repo_deleted') {
      // Source repository was deleted
      commentBody = commentBody.concat([
        `Hey @${summaryData.author}! I've generated release notes based on CodeRabbit's analysis.`,
        '',
        `Since the source repository has been deleted, I couldn't automatically commit the file. Please create \`${fileName}\` in the base repository with the following content:`,
        '',
        '```markdown',
        fileContent,
        '```',
        '',
        'You can edit the summary if needed before committing.',
      ]);
    } else {
      // Manual creation required (status is 'manual_required' or undefined/fallback)
      commentBody = commentBody.concat([
        `Hey @${summaryData.author}! I've generated release notes based on CodeRabbit's analysis.`,
        '',
        `I couldn't automatically commit the file to your branch. Please create \`${fileName}\` with the following content:`,
        '',
        '```markdown',
        fileContent,
        '```',
        '',
        'You can edit the summary if needed before committing.',
      ]);
    }

    await octokit.rest.issues.createComment({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      body: commentBody.join('\n'),
    });

    console.log('✅ Successfully commented on PR');
  } catch (error) {
    console.log('Error commenting on PR:', error.message);
    process.exit(1);
  }
}

commentOnPR();
