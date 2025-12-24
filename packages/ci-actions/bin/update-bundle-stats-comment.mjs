#!/usr/bin/env node

/**
 * Updates (or creates) a bundle stats comment on a pull request.
 * Requires the following environment variables to be set:
 *  - GITHUB_TOKEN
 *  - GITHUB_REPOSITORY (owner/repo)
 *  - PR_NUMBER
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { Octokit } from '@octokit/rest';

function parseArgs(argv) {
  const args = {
    commentFile: null,
    identifier: null,
  };

  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];

    if (!key?.startsWith('--')) {
      throw new Error(
        `Unexpected argument "${key ?? ''}". Use --key value pairs.`,
      );
    }

    if (typeof value === 'undefined') {
      throw new Error(`Missing value for argument "${key}".`);
    }

    switch (key) {
      case '--comment-file':
        args.commentFile = value;
        break;
      case '--identifier':
        args.identifier = value;
        break;
      default:
        throw new Error(`Unknown argument "${key}".`);
    }
  }

  if (!args.commentFile) {
    throw new Error('Missing required argument "--comment-file".');
  }

  if (!args.identifier) {
    throw new Error('Missing required argument "--identifier".');
  }

  return args;
}

async function loadCommentBody(commentFile) {
  const absolutePath = path.resolve(process.cwd(), commentFile);
  return readFile(absolutePath, 'utf8');
}

function getRepoInfo() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY environment variable is required.');
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value "${repository}".`);
  }

  return { owner, repo };
}

function getPullRequestNumber() {
  const rawNumber = process.env.PR_NUMBER ?? '';
  const prNumber = Number.parseInt(rawNumber, 10);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error(
      'PR_NUMBER environment variable must be a positive integer.',
    );
  }

  return prNumber;
}

function assertGitHubToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required.');
  }
  return token;
}

async function listComments(octokit, owner, repo, issueNumber) {
  return octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
}

function isGitHubActionsBot(comment) {
  return comment.user?.login === 'github-actions[bot]';
}

async function main() {
  const { commentFile, identifier } = parseArgs(process.argv);
  const commentBody = await loadCommentBody(commentFile);
  const token = assertGitHubToken();
  const { owner, repo } = getRepoInfo();
  const issueNumber = getPullRequestNumber();

  const octokit = new Octokit({ auth: token });

  const comments = await listComments(octokit, owner, repo, issueNumber);

  const existingComment = comments.find(
    comment =>
      isGitHubActionsBot(comment) && comment.body?.includes(identifier),
  );

  if (existingComment) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: commentBody,
    });
    console.log('Updated existing bundle stats comment.');
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentBody,
    });
    console.log('Created new bundle stats comment.');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
