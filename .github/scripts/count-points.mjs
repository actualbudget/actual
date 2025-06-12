import { Octokit } from '@octokit/rest';

/**
 * Used for calculating the monthly points each core contributor has earned.
 * These are used for payouts depending.
 */
async function countContributorPoints() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = 'actualbudget';
  const repo = 'actual';

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
        reviews: 0,
        labelRemovals: 0,
        issueClosings: 0,
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

  // Get all PRs using pagination
  const recentPRs = await octokit.paginate(
    octokit.pulls.list,
    {
      owner,
      repo,
      state: 'closed',
      sort: 'merged',
      direction: 'desc',
      per_page: 100,
    },
    (response, done) => {
      const prs = response.data.filter(
        pr => pr.merged_at && new Date(pr.merged_at) > since,
      );

      // If we found PRs older than a month or got less than 100 PRs, stop pagination
      if (prs.length < response.data.length || response.data.length < 100) {
        done();
      }

      return prs;
    },
  );

  // Get reviews and PR details for each PR
  for (const pr of recentPRs) {
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: pr.number,
    });

    // Get PR details to calculate points
    const { data: prDetails } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pr.number,
    });

    // Calculate points based on PR size
    const totalChanges = prDetails.additions + prDetails.deletions;
    let prPoints = 0;
    if (totalChanges > 1000) {
      prPoints = 6;
    } else if (totalChanges > 100) {
      prPoints = 4;
    } else {
      prPoints = 2;
    }

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
        userStats.reviews++;
        userStats.points += prPoints;
      });
  }

  // Get all issues with label events in the last month
  const { data: issues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'all',
    per_page: 100,
    since: since.toISOString(),
  });

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
          new Date(event.created_at) > since && stats.has(event.actor?.login),
      )
      .forEach(event => {
        if (
          event.event === 'unlabeled' &&
          event.label?.name === 'needs triage'
        ) {
          const remover = event.actor.login;
          const userStats = stats.get(remover);
          userStats.labelRemovals++;
          userStats.points++;
        }

        if (event.event === 'closed') {
          const closer = event.actor.login;
          const userStats = stats.get(closer);
          userStats.issueClosings++;
          userStats.points++;
        }
      });
  }

  // Print all statistics
  printStats(
    'PR Review Statistics',
    stats => stats.reviews,
    (user, count) => `${user}: ${count}`,
  );
  printStats(
    '"Needs Triage" Label Removal Statistics',
    stats => stats.labelRemovals,
    (user, count) => `${user}: ${count}`,
  );
  printStats(
    'Issue Closing Statistics',
    stats => stats.issueClosings,
    (user, count) => `${user}: ${count}`,
  );

  // Print points summary
  printStats(
    'Points Summary',
    stats => stats.points,
    (user, userPoints) => `${user}: ${userPoints}`,
  );

  // Calculate and print total points
  const totalPoints = Array.from(stats.values()).reduce(
    (sum, userStats) => sum + userStats.points,
    0,
  );
  console.log('\nTotal points earned: ' + totalPoints);
}

/**
 * Used for calculating the monthly points each core contributor has earned.
 * These are used for payouts depending.
 */
countContributorPoints().catch(console.error);
