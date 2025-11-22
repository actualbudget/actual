#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const prNumber = process.env.PR_NUMBER;
const inputUserLogin = process.env.USER_LOGIN;

if (!token || !repo || !prNumber) {
  console.log('Missing required environment variables');
  console.log('Required: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER');
  console.log(
    'Optional: USER_LOGIN (will fetch from recent review/comment if not provided)',
  );
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const octokit = new Octokit({ auth: token });
const orgName = 'actualbudget';

async function getRecentReviewerOrCommenter() {
  // Fetch the most recent review
  try {
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    // Get the most recent non-author review
    const recentReview = reviews
      .filter(review => review.state !== 'PENDING')
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];

    if (recentReview) {
      console.log(
        `Found recent review by ${recentReview.user.login} at ${recentReview.submitted_at}`,
      );
      return recentReview.user.login;
    }
  } catch (error) {
    console.log('Could not fetch reviews:', error.message);
  }

  // If no review, try fetching the most recent comment
  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo: repoName,
      issue_number: prNumber,
    });

    // Filter out bot comments and get the most recent
    const recentComment = comments
      .filter(comment => !comment.user.type || comment.user.type !== 'Bot')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (recentComment) {
      console.log(
        `Found recent comment by ${recentComment.user.login} at ${recentComment.created_at}`,
      );
      return recentComment.user.login;
    }
  } catch (error) {
    console.log('Could not fetch comments:', error.message);
  }

  return null;
}

async function assignMaintainer() {
  try {
    // Get PR details to check if user is the author
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    // If USER_LOGIN is not provided, try to get it from recent review/comment
    let userLogin = inputUserLogin;
    if (!userLogin) {
      console.log(
        `USER_LOGIN not provided, fetching from recent review/comment for PR #${prNumber}...`,
      );
      userLogin = await getRecentReviewerOrCommenter();
      if (!userLogin) {
        console.log(
          `No recent review or comment found for PR #${prNumber}, skipping assignment`,
        );
        return;
      }
    }

    console.log(
      `Checking if ${userLogin} should be assigned to PR #${prNumber}...`,
    );

    // Skip if user is the PR author
    if (pr.user.login === userLogin) {
      console.log(
        `Skipping: ${userLogin} is the PR author, not assigning to own PR`,
      );
      return;
    }

    // Check if user is a member of the organization
    try {
      await octokit.rest.orgs.checkMembershipForUser({
        org: orgName,
        username: userLogin,
      });
      console.log(`${userLogin} is a member of ${orgName} organization`);
    } catch (error) {
      if (error.status === 404) {
        console.log(
          `Skipping: ${userLogin} is not a member of ${orgName} organization`,
        );
        return;
      }
      // If we get a 403, it might be due to insufficient permissions
      // Log but don't fail - this prevents the workflow from breaking
      if (error.status === 403) {
        console.log(
          `Warning: Cannot verify organization membership (403). This may be due to insufficient token permissions. Skipping assignment.`,
        );
        return;
      }
      throw error;
    }

    // Get current assignees
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo: repoName,
      issue_number: prNumber,
    });

    const currentAssignees = issue.assignees.map(assignee => assignee.login);

    // Skip if user is already assigned
    if (currentAssignees.includes(userLogin)) {
      console.log(
        `Skipping: ${userLogin} is already assigned to PR #${prNumber}`,
      );
      return;
    }

    // Add user as assignee
    console.log(`Adding ${userLogin} as assignee to PR #${prNumber}...`);
    await octokit.rest.issues.addAssignees({
      owner,
      repo: repoName,
      issue_number: prNumber,
      assignees: [userLogin],
    });

    console.log(`Successfully assigned ${userLogin} to PR #${prNumber}`);
  } catch (error) {
    console.log('Error assigning maintainer:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log(
        'Response data:',
        JSON.stringify(error.response.data, null, 2),
      );
    }
    console.log('Stack:', error.stack);
    process.exit(1);
  }
}

assignMaintainer().catch(error => {
  console.log('Unhandled error:', error.message);
  console.log('Stack:', error.stack);
  process.exit(1);
});
