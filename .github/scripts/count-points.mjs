import { Octokit } from '@octokit/rest';
import { minimatch } from 'minimatch';

/** Repository-specific configuration for points calculation */
const REPOSITORY_CONFIG = new Map([
  [
    'actual',
    {
      POINTS_PER_ISSUE_TRIAGE_ACTION: 1,
      POINTS_PER_ISSUE_CLOSING_ACTION: 1,
      POINTS_PER_RELEASE_PR: 0,
      PR_REVIEW_POINT_TIERS: [
        { minChanges: 500, points: 8 },
        { minChanges: 100, points: 6 },
        { minChanges: 10, points: 2 },
        { minChanges: 0, points: 1 },
      ],
      EXCLUDED_FILES: [
        'yarn.lock',
        '.yarn/**/*',
        'packages/component-library/src/icons/**/*',
        'release-notes/**/*',
      ],
    },
  ],
  [
    'docs',
    {
      POINTS_PER_ISSUE_TRIAGE_ACTION: 1,
      POINTS_PER_ISSUE_CLOSING_ACTION: 1,
      POINTS_PER_RELEASE_PR: 4,
      PR_REVIEW_POINT_TIERS: [
        { minChanges: 2000, points: 6 },
        { minChanges: 200, points: 4 },
        { minChanges: 0, points: 2 },
      ],
      EXCLUDED_FILES: ['yarn.lock', '.yarn/**/*'],
    },
  ],
]);

/**
 * Get the start and end dates for the last month.
 * @returns {Object} An object containing the start and end dates.
 */
function getLastMonthDates() {
  // Get data relating to the last month
  const now = new Date();
  const firstDayOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );
  const since = process.env.START_DATE
    ? new Date(process.env.START_DATE)
    : firstDayOfLastMonth;

  // Calculate the end of the month for the since date
  const until = new Date(
    since.getFullYear(),
    since.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return { since, until };
}

/**
 * Used for calculating the monthly points each core contributor has earned.
 * These are used for payouts depending.
 * @param {string} repo - The repository to analyze ('actual' or 'docs')
 * @returns {number} The total points earned for the repository
 */
async function countContributorPoints(repo) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = 'actualbudget';
  const config = REPOSITORY_CONFIG.get(repo);

  const { since, until } = getLastMonthDates();

  // Get organization members
  const { data: orgMembers } = await octokit.orgs.listMembers({
    org: owner,
  });
  const orgMemberLogins = new Set(orgMembers.map(member => member.login));

  // Initialize stats map with all org members
  const stats = new Map(
    Array.from(orgMemberLogins).map(login => [
      login,
      {
        reviews: [], // Will store objects with PR number and points
        labelRemovals: [],
        issueClosings: [],
        points: 0,
      },
    ]),
  );

  // Helper function to print statistics
  const printStats = (title, getValue, formatLine) => {
    console.log(`\n${title}:`);
    console.log('='.repeat(title.length + 1));

    const entries = Array.from(stats.entries())
      .map(([user, userStats]) => [user, getValue(userStats)])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      console.log(`No ${title.toLowerCase()} found in the last month.`);
    } else {
      entries.forEach(([user, count]) => {
        console.log(formatLine(user, count));
      });
    }
  };

  // Get all PRs using search
  const searchQuery = `repo:${owner}/${repo} is:pr is:merged merged:${since.toISOString()}..${until.toISOString()}`;
  const recentPRs = await octokit.paginate(
    octokit.search.issuesAndPullRequests,
    {
      q: searchQuery,
      per_page: 100,
      advanced_search: true,
    },
    response => response.data,
  );

  // Get reviews and PR details for each PR
  for (const pr of recentPRs) {
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: pr.number,
    });

    // Get list of modified files
    const { data: modifiedFiles } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pr.number,
    });

    // Calculate points based on PR size, excluding specified files
    const totalChanges = modifiedFiles
      .filter(
        file =>
          !config.EXCLUDED_FILES.some(pattern =>
            minimatch(file.filename, pattern),
          ),
      )
      .reduce((sum, file) => sum + file.additions + file.deletions, 0);

    // Check if this is a release PR
    const isReleasePR = pr.title.match(/^🔖 \(\d+\.\d+\.\d+\)/);

    // Calculate points for reviewers based on PR size
    const prPoints = config.PR_REVIEW_POINT_TIERS.find(
      tier => totalChanges > tier.minChanges,
    ).points;

    // Award points to the PR creator if it's a release PR
    if (isReleasePR && stats.has(pr.user.login)) {
      const creatorStats = stats.get(pr.user.login);
      creatorStats.reviews.push({
        pr: pr.number.toString(),
        points: config.POINTS_PER_RELEASE_PR,
        isReleaseCreator: true,
      });
      creatorStats.points += config.POINTS_PER_RELEASE_PR;
    } else {
      // Add points to the reviewers
      const uniqueReviewers = new Set();
      reviews
        .filter(
          review =>
            stats.has(review.user?.login) &&
            review.state === 'APPROVED' &&
            !uniqueReviewers.has(review.user?.login),
        )
        .forEach(({ user: { login: reviewer } }) => {
          uniqueReviewers.add(reviewer);
          const userStats = stats.get(reviewer);
          userStats.reviews.push({
            pr: pr.number.toString(),
            points: prPoints,
          });
          userStats.points += prPoints;
        });
    }
  }

  // Get all issues with label events in the last month
  const issues = await octokit.paginate(
    octokit.issues.listForRepo,
    {
      owner,
      repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      since: since.toISOString(),
    },
    (response, done) =>
      response.data.filter(issue => new Date(issue.updated_at) <= until),
  );

  // Get label events for each issue
  for (const issue of issues) {
    const { data: events } = await octokit.issues.listEventsForTimeline({
      owner,
      repo,
      issue_number: issue.number,
    });

    // Process events
    events
      .filter(
        event =>
          new Date(event.created_at) > since &&
          new Date(event.created_at) <= until &&
          stats.has(event.actor?.login),
      )
      .forEach(event => {
        if (
          event.event === 'unlabeled' &&
          event.label &&
          event.label.name.toLowerCase() === 'needs triage'
        ) {
          const remover = event.actor.login;
          const userStats = stats.get(remover);
          userStats.labelRemovals.push(issue.number.toString());
          userStats.points += config.POINTS_PER_ISSUE_TRIAGE_ACTION;
        }

        // Check if the issue was closed with "no planned" status
        if (event.event === 'closed' && event.state_reason === 'not_planned') {
          const closer = event.actor.login;
          const userStats = stats.get(closer);
          userStats.issueClosings.push(issue.number.toString());
          userStats.points += config.POINTS_PER_ISSUE_CLOSING_ACTION;
        }
      });
  }

  // Print all statistics
  printStats(
    `PR Review Statistics (${repo})`,
    stats => stats.reviews.length,
    (user, count) =>
      `${user}: ${count} (PRs: ${stats
        .get(user)
        .reviews.map(r => {
          if (r.isReleaseCreator) {
            return `#${r.pr} (${r.points}pts - Release Creator)`;
          }
          return `#${r.pr} (${r.points}pts)`;
        })
        .join(', ')})`,
  );
  printStats(
    `"Needs Triage" Label Removal Statistics (${repo})`,
    stats => stats.labelRemovals.length,
    (user, count) =>
      `${user}: ${count} (Issues: ${stats.get(user).labelRemovals.join(', ')})`,
  );
  printStats(
    `Issue Closing Statistics (${repo})`,
    stats => stats.issueClosings.length,
    (user, count) =>
      `${user}: ${count} (Issues: ${stats.get(user).issueClosings.join(', ')})`,
  );

  // Print points summary
  printStats(
    `Points Summary (${repo})`,
    stats => stats.points,
    (user, userPoints) => `${user}: ${userPoints}`,
  );

  // Calculate and print total points
  const totalPoints = Array.from(stats.values()).reduce(
    (sum, userStats) => sum + userStats.points,
    0,
  );
  console.log(`\nTotal points earned for ${repo}: ${totalPoints}`);

  // Return the points
  return new Map(
    Array.from(stats.entries()).map(([login, userStats]) => [
      login,
      userStats.points,
    ]),
  );
}

/**
 * Calculate the points for both repositories and print cumulative results
 */
async function calculateCumulativePoints() {
  // Get stats for each repository
  const repoPointsResults = await Promise.all(
    Array.from(REPOSITORY_CONFIG.keys()).map(countContributorPoints),
  );

  // Calculate cumulative stats
  const cumulativeStats = new Map(repoPointsResults[0]);

  // Combine stats from all repositories
  for (let i = 1; i < repoPointsResults.length; i++) {
    for (const [login, points] of repoPointsResults[i].entries()) {
      if (!cumulativeStats.has(login)) {
        cumulativeStats.set(login, 0);
      }

      cumulativeStats.set(login, cumulativeStats.get(login) + points);
    }
  }

  // Print cumulative statistics
  console.log('\n\nCUMULATIVE STATISTICS ACROSS ALL REPOSITORIES');
  console.log('='.repeat(50));

  console.log('\nCumulative Points Summary:');
  console.log('='.repeat('Cumulative Points Summary'.length + 1));

  const entries = Array.from(cumulativeStats.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    console.log('No cumulative points summary found.');
  } else {
    entries.forEach(([user, points]) => {
      console.log(`${user}: ${points}`);
    });
  }

  // Calculate and print total cumulative points
  const totalCumulativePoints = Array.from(cumulativeStats.values()).reduce(
    (sum, points) => sum + points,
    0,
  );
  console.log('\nTotal cumulative points earned: ' + totalCumulativePoints);
}

// Run the calculations
calculateCumulativePoints().catch(console.error);
