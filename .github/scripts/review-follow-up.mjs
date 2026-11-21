// Follows up on pull requests that are waiting on their author after a
// maintainer review.
//
// 1. A maintainer reviews a PR with "changes requested" or "comment" (anything
//    but an approval).
// 2. If the author does not respond within DAYS_BEFORE_NUDGE days, a reminder
//    comment is posted.
// 3. If the author still does not respond within DAYS_BEFORE_CLOSE days of the
//    reminder, the PR is closed.
//
// The clock is reset by any sign of life from the author: pushing commits,
// commenting, replying to review comments or re-requesting a review. It also
// resets when a maintainer leaves a newer review or reopens the PR.

export const DAYS_BEFORE_NUDGE = 7;
export const DAYS_BEFORE_CLOSE = 3;

const NUDGE_MARKER = '<!-- review-follow-up:nudge -->';
const CLOSE_MARKER = '<!-- review-follow-up:close -->';
const ACTIONS_BOT_LOGIN = 'github-actions[bot]';
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAINTAINER_PERMISSIONS = ['admin', 'maintain', 'write'];
const REVIEW_STATES = ['approved', 'changes_requested', 'commented'];

function eventTime(event) {
  const date =
    event.submitted_at ?? event.created_at ?? event.committer?.date ?? null;
  return date ? new Date(date).getTime() : 0;
}

function eventLogin(event) {
  return (event.user ?? event.actor)?.login ?? null;
}

/**
 * Decide what to do with a single pull request.
 *
 * @param {object} params
 * @param {object} params.pr - Pull request (from `pulls.list`).
 * @param {object[]} params.timeline - Timeline events of the pull request.
 * @param {Set<string>} params.maintainers - Logins of the maintainers that
 *   reviewed the pull request.
 * @param {number} params.now - Current time in milliseconds.
 * @returns {{ action: 'none' | 'nudge' | 'close', reason: string, reviewer?: string }}
 */
export function decide({ pr, timeline, maintainers, now }) {
  const author = pr.user.login;

  const review = timeline
    .filter(
      event =>
        event.event === 'reviewed' &&
        REVIEW_STATES.includes(event.state) &&
        eventLogin(event) !== author &&
        maintainers.has(eventLogin(event)),
    )
    .sort((a, b) => eventTime(a) - eventTime(b))
    .at(-1);

  if (!review) {
    return { action: 'none', reason: 'no maintainer review' };
  }
  if (review.state === 'approved') {
    return {
      action: 'none',
      reason: 'latest maintainer review is an approval',
    };
  }

  const reviewer = eventLogin(review);
  const reviewedAt = eventTime(review);

  if (review.commit_id && review.commit_id !== pr.head.sha) {
    return { action: 'none', reason: 'commits pushed since the review' };
  }

  const hasActivitySinceReview = timeline.some(event => {
    if (eventTime(event) <= reviewedAt) {
      return false;
    }
    switch (event.event) {
      case 'committed':
      case 'head_ref_force_pushed':
      case 'reopened':
        return true;
      case 'commented':
      case 'reviewed':
      case 'review_requested':
        return eventLogin(event) === author;
      default:
        return false;
    }
  });

  if (hasActivitySinceReview) {
    return { action: 'none', reason: 'author responded to the review' };
  }

  const nudge = timeline
    .filter(
      event =>
        event.event === 'commented' &&
        eventLogin(event) === ACTIONS_BOT_LOGIN &&
        event.body?.includes(NUDGE_MARKER) &&
        eventTime(event) > reviewedAt,
    )
    .at(-1);

  if (!nudge) {
    if (now - reviewedAt >= DAYS_BEFORE_NUDGE * DAY_IN_MS) {
      return { action: 'nudge', reason: 'no response to the review', reviewer };
    }
    return { action: 'none', reason: 'waiting for the author', reviewer };
  }

  if (now - eventTime(nudge) >= DAYS_BEFORE_CLOSE * DAY_IN_MS) {
    return { action: 'close', reason: 'no response to the reminder', reviewer };
  }
  return { action: 'none', reason: 'reminder sent, waiting for the author' };
}

function nudgeMessage(author) {
  return [
    `:wave: Hi @${author}! A maintainer reviewed this PR ${DAYS_BEFORE_NUDGE} days ago and it looks like the feedback has not been addressed yet.`,
    '',
    `Are you still working on this? Please push your changes or leave a comment to let us know. Otherwise this PR will be closed in ${DAYS_BEFORE_CLOSE} days.`,
    '',
    NUDGE_MARKER,
  ].join('\n');
}

function closeMessage() {
  return [
    `This PR was closed because the review feedback was not addressed within ${DAYS_BEFORE_NUDGE + DAYS_BEFORE_CLOSE} days. If you would like to resume working on this, please leave a comment here or reach out to the maintainer team on Discord to have it reopened.`,
    '',
    CLOSE_MARKER,
  ].join('\n');
}

export async function run({ github, context, core, dryRun = false }) {
  const { owner, repo } = context.repo;
  const now = Date.now();
  const permissionCache = new Map();

  async function isMaintainer(event) {
    const user = event.user;
    if (!user || user.type === 'Bot') {
      return false;
    }
    if (['OWNER', 'MEMBER'].includes(event.author_association)) {
      return true;
    }
    if (!permissionCache.has(user.login)) {
      const permission = await github.rest.repos
        .getCollaboratorPermissionLevel({ owner, repo, username: user.login })
        .then(({ data }) => data.permission)
        .catch(() => 'none');
      permissionCache.set(user.login, permission);
    }
    return MAINTAINER_PERMISSIONS.includes(permissionCache.get(user.login));
  }

  const pulls = await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });

  const summary = { nudge: 0, close: 0 };

  for (const pr of pulls) {
    if (!pr.user || pr.user.type === 'Bot') {
      continue;
    }

    const timeline = await github.paginate(
      github.rest.issues.listEventsForTimeline,
      { owner, repo, issue_number: pr.number, per_page: 100 },
    );

    const maintainers = new Set();
    for (const event of timeline) {
      if (event.event === 'reviewed' && (await isMaintainer(event))) {
        maintainers.add(event.user.login);
      }
    }

    const { action, reason } = decide({ pr, timeline, maintainers, now });
    core.info(`#${pr.number}: ${action} (${reason})`);

    if (action === 'none') {
      continue;
    }
    summary[action]++;
    if (dryRun) {
      continue;
    }

    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr.number,
      body: action === 'nudge' ? nudgeMessage(pr.user.login) : closeMessage(),
    });
    if (action === 'close') {
      await github.rest.pulls.update({
        owner,
        repo,
        pull_number: pr.number,
        state: 'closed',
      });
    }
  }

  core.info(
    `${dryRun ? '[dry run] ' : ''}Reminded: ${summary.nudge}, closed: ${summary.close}`,
  );
}
