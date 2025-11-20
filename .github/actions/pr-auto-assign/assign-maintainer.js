#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const prNumber = process.env.PR_NUMBER;
const userLogin = process.env.USER_LOGIN;

if (!token || !repo || !prNumber || !userLogin) {
  console.log('Missing required environment variables');
  console.log(
    'Required: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, USER_LOGIN',
  );
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const octokit = new Octokit({ auth: token });
const orgName = 'actualbudget';

async function assignMaintainer() {
  try {
    console.log(
      `Checking if ${userLogin} should be assigned to PR #${prNumber}...`,
    );

    // Get PR details to check if user is the author
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

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
