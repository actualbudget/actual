import { Octokit } from '@octokit/rest';
import { minimatch } from 'minimatch';
import pLimit from 'p-limit';

const limit = pLimit(50);

const CONFIG = {
  POINTS_PER_ISSUE_TRIAGE_ACTION: 1,
  POINTS_PER_ISSUE_CLOSING_ACTION: 1,
  POINTS_PER_RELEASE_PR: 4, // Awarded to whoever merges the release PR
  // Point tiers for code changes (non-docs)
  CODE_PR_REVIEW_POINT_TIERS: [
    { minChanges: 500, points: 8 },
    { minChanges: 100, points: 6 },
    { minChanges: 10, points: 2 },
    { minChanges: 0, points: 1 },
  ],
  // Point tiers for docs changes (packages/docs/**)
  DOCS_PR_REVIEW_POINT_TIERS: [
    { minChanges: 2000, points: 6 },
    { minChanges: 200, points: 4 },
    { minChanges: 0, points: 2 },
  ],
  EXCLUDED_FILES: [
    'yarn.lock',
    '.yarn/**/*',
    'packages/component-library/src/icons/**/*',
    'release-notes/**/*',
    'upcoming-release-notes/**/*',
  ],
  DOCS_FILES_PATTERN: 'packages/docs/**/*',
};

/**
 * Get the start and end dates for the last month.
 * @returns {Object} An object containing the start and end dates.
 */
function getLastMonthDates() {
  // Get data relating to the last month
  const now = new Date();
  // Always use UTC for calculations
  const firstDayOfLastMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0),
  );
  const since = process.env.START_DATE
    ? new Date(Date.parse(process.env.START_DATE))
    : firstDayOfLastMonth;

  // Calculate the end of the month for the since date in UTC
  const until = new Date(
    Date.UTC(
      since.getUTCFullYear(),
      since.getUTCMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  );

  return { since, until };
}

/**
 * Used for calculating the monthly points each core contributor has earned.
 * These are used for payouts depending.
 * @returns {Map} A map of contributor logins to their total points earned
 */
async function countContributorPoints() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  const owner = 'actualbudget';
  const repo = 'actual';

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
        codeReviews: [], // Will store objects with PR number and points for main repo changes
        docsReviews: [], // Will store objects with PR number and points for docs changes
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
    'GET /search/issues',
    {
      q: searchQuery,
      per_page: 100,
      advanced_search: true,
    },
    response => response.data.filter(pr => pr.number),
  );

  // Get reviews and PR details for each PR
  await Promise.all(
    recentPRs.map(pr =>
      limit(async () => {
        const [reviews, modifiedFiles] = await Promise.all([
          octokit.pulls.listReviews({ owner, repo, pull_number: pr.number }),
          octokit.paginate(
            octokit.pulls.listFiles,
            {
              owner,
              repo,
              pull_number: pr.number,
              per_page: 100,
            },
            res => res.data,
          ),
        ]);

        const filteredFiles = modifiedFiles.filter(
          file =>
            !CONFIG.EXCLUDED_FILES.some(pattern =>
              minimatch(file.filename, pattern, { dot: true }),
            ),
        );

        const docsFiles = filteredFiles.filter(file =>
          minimatch(file.filename, CONFIG.DOCS_FILES_PATTERN, { dot: true }),
        );
        const codeFiles = filteredFiles.filter(
          file =>
            !minimatch(file.filename, CONFIG.DOCS_FILES_PATTERN, { dot: true }),
        );

        const docsChanges = docsFiles.reduce(
          (sum, file) => sum + file.additions + file.deletions,
          0,
        );
        const codeChanges = codeFiles.reduce(
          (sum, file) => sum + file.additions + file.deletions,
          0,
        );

        const docsPoints =
          docsChanges > 0
            ? (CONFIG.DOCS_PR_REVIEW_POINT_TIERS.find(
                t => docsChanges >= t.minChanges,
              )?.points ?? 0)
            : 0;
        const codePoints =
          codeChanges > 0 || docsChanges === 0
            ? (CONFIG.CODE_PR_REVIEW_POINT_TIERS.find(
                t => codeChanges >= t.minChanges,
              )?.points ?? 0)
            : 0;

        const isReleasePR = pr.title.match(/🔖.*\d+\.\d+\.\d+/);

        if (isReleasePR) {
          // release PRs are created by the github-actions bot so we attribute points to the merger
          const { data: prDetails } = await octokit.pulls.get({
            owner,
            repo,
            pull_number: pr.number,
          });

          if (prDetails.merged_by && stats.has(prDetails.merged_by.login)) {
            const mergerStats = stats.get(prDetails.merged_by.login);
            mergerStats.codeReviews.push({
              pr: pr.number.toString(),
              points: CONFIG.POINTS_PER_RELEASE_PR,
              isReleaseMerger: true,
            });
            mergerStats.points += CONFIG.POINTS_PER_RELEASE_PR;
          }
        } else {
          const uniqueReviewers = new Set();
          reviews.data.forEach(review => {
            if (
              review.state === 'APPROVED' &&
              stats.has(review.user?.login) &&
              !uniqueReviewers.has(review.user?.login)
            ) {
              const reviewer = review.user.login;
              uniqueReviewers.add(reviewer);
              const userStats = stats.get(reviewer);

              if (docsPoints > 0) {
                userStats.docsReviews.push({
                  pr: pr.number.toString(),
                  points: docsPoints,
                });
                userStats.points += docsPoints;
              }

              if (codePoints > 0) {
                userStats.codeReviews.push({
                  pr: pr.number.toString(),
                  points: codePoints,
                });
                userStats.points += codePoints;
              }
            }
          });
        }
      }),
    ),
  );

  // Get all issues with label events in the last month
  const issues = await octokit.paginate(octokit.issues.listForRepo, {
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
    since: since.toISOString(),
  });

  // Get label events for each issue
  await Promise.all(
    issues.map(issue =>
      limit(async () => {
        const { data: events } = await octokit.issues.listEventsForTimeline({
          owner,
          repo,
          issue_number: issue.number,
        });

        events
          .filter(event => {
            const createdAt = new Date(event.created_at);
            return (
              createdAt.getTime() > since.getTime() &&
              createdAt.getTime() <= until.getTime() &&
              stats.has(event.actor?.login)
            );
          })
          .forEach(event => {
            if (
              event.event === 'unlabeled' &&
              event.label?.name.toLowerCase() === 'needs triage'
            ) {
              const remover = event.actor.login;
              const userStats = stats.get(remover);
              userStats.labelRemovals.push(issue.number.toString());
              userStats.points += CONFIG.POINTS_PER_ISSUE_TRIAGE_ACTION;
            }

            if (
              event.event === 'closed' &&
              ['not_planned', 'duplicate'].includes(event.state_reason)
            ) {
              const closer = event.actor.login;
              const userStats = stats.get(closer);
              userStats.issueClosings.push(issue.number.toString());
              userStats.points += CONFIG.POINTS_PER_ISSUE_CLOSING_ACTION;
            }
          });
      }),
    ),
  );

  // Print all statistics
  printStats(
    'Code Review Statistics',
    stats => stats.codeReviews.length,
    (user, count) =>
      `${user}: ${count} (PRs: ${stats
        .get(user)
        .codeReviews.map(r => {
          if (r.isReleaseMerger) {
            return `#${r.pr} (${r.points}pts - Release Merger)`;
          }
          return `#${r.pr} (${r.points}pts)`;
        })
        .join(', ')})`,
  );

  printStats(
    'Docs Review Statistics',
    stats => stats.docsReviews.length,
    (user, count) =>
      `${user}: ${count} (PRs: ${stats
        .get(user)
        .docsReviews.map(r => `#${r.pr} (${r.points}pts)`)
        .join(', ')})`,
  );

  printStats(
    '"Needs Triage" Label Removal Statistics',
    stats => stats.labelRemovals.length,
    (user, count) =>
      `${user}: ${count} (Issues: ${stats.get(user).labelRemovals.join(', ')})`,
  );

  printStats(
    'Issue Closing Statistics',
    stats => stats.issueClosings.length,
    (user, count) =>
      `${user}: ${count} (Issues: ${stats.get(user).issueClosings.join(', ')})`,
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
  console.log(`\nTotal points earned: ${totalPoints}`);

  // Return the points
  return new Map(
    Array.from(stats.entries()).map(([login, userStats]) => [
      login,
      userStats.points,
    ]),
  );
}

// Run the calculations
countContributorPoints().catch(console.error);
