#!/usr/bin/env node

// overview:
// 1. Fetch the issues that are linked to the PR
// 2. Filter out the issues that are not feature requests
// 3. For each feature request:
//   1. Remove the 'help wanted' & 'needs votes' labels
//   3. Find the automated comment, hide the comment as 'outdated'
//   5. Post a new comment saying that the feature request has been implemented, and will be released in the next version. Link to the PR.

async function makeAPIRequest(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

function group(name, body) {
  console.log(`::group::${name}`);
  const result = body();
  if (result instanceof Promise) {
    return result.finally(() => console.log(`::endgroup::`));
  }
  console.log(`::endgroup::`);
  return result;
}

async function main() {
  const featureRequests = await group('Pull Request API Response', async () => {
    const res = await makeAPIRequest(
      /* GraphQL */ `
        query FetchLinkedIssues($pr: Int!) {
          repository(owner: "actualbudget", name: "actual") {
            pullRequest(number: $pr) {
              closingIssuesReferences(first: 10) {
                nodes {
                  id
                  number
                  labels(first: 10) {
                    nodes {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `,
      { pr: parseInt(process.env.PR_NUMBER) },
    );

    console.log(JSON.stringify(res, null, 2));

    return res.data.repository.pullRequest.closingIssuesReferences.nodes.filter(
      issue => issue.labels.nodes.some(label => label.name === 'feature'),
    );
  });

  if (featureRequests.length === 0) {
    console.log('No linked feature requests found');
    return;
  }

  for (const { id, number, labels } of featureRequests) {
    await group(`Issue #${number}: Remove labels`, async () => {
      const toRemove = labels.nodes
        .filter(
          label =>
            label.name === 'help wanted' ||
            label.name === 'needs votes' ||
            lahel.name === 'good first issue',
        )
        .map(label => label.id);
      const res = await makeAPIRequest(
        /* GraphQL */ `
          mutation RemoveLabels($issue: ID!, $labels: [ID!]!) {
            removeLabelsFromLabelable(
              input: {
                clientMutationId: "1"
                labelIds: $labels
                labelableId: $issue
              }
            ) {
              clientMutationId
            }
          }
        `,
        {
          issue: id,
          labels: toRemove,
        },
      );
      console.log(JSON.stringify(res, null, 2));
    });

    await group(`Issue #${number}: Collapse automatic comment`, async () => {
      const commentRes = await makeAPIRequest(
        /* GraphQL */ `
          query FetchComments($issue: Int!) {
            repository(owner: "actualbudget", name: "actual") {
              issue(number: $issue) {
                comments(first: 100) {
                  nodes {
                    id
                    body
                    author {
                      login
                    }
                  }
                }
              }
            }
          }
        `,
        { issue: number },
      );
      console.log(JSON.stringify(commentRes, null, 2));

      const comments = commentRes.data.repository.issue.comments.nodes.filter(
        comment => comment.author.login === 'github-actions',
      );
      const commentToCollapse =
        comments.find(comment =>
          comment.body.includes('<!-- feature-auto-close-comment -->'),
        ) ||
        comments.find(comment =>
          comment.body.includes(
            ':sparkles: Thanks for sharing your idea! :sparkles:',
          ),
        );

      if (!commentToCollapse) {
        console.log('No comment to collapse found');
        process.exit(1);
      }

      const res = await makeAPIRequest(
        /* GraphQL */ `
          mutation CollapseComment($comment: ID!) {
            minimizeComment(
              input: { classifier: OUTDATED, subjectId: $comment }
            ) {
              clientMutationId
            }
          }
        `,
        { comment: commentToCollapse.id },
      );
      console.log(JSON.stringify(res, null, 2));
    });

    await group(`Issue #${number}: Post comment`, async () => {
      const res = await makeAPIRequest(
        /* GraphQL */ `
          mutation PostComment($issue: ID!, $body: String!) {
            addComment(
              input: { subjectId: $issue, body: $body, clientMutationId: "1" }
            ) {
              clientMutationId
            }
          }
        `,
        {
          issue: id,
          body: `:tada: This feature has been implemented in #${process.env.PR_NUMBER} and will be released in the next version. Thanks for sharing your idea! :tada:\n\n<!-- feature-implemented-comment -->`,
        },
      );
      console.log(JSON.stringify(res, null, 2));
    });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
