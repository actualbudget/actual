const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const TERMINAL_FAILURES = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'skipped',
  'stale',
  'startup_failure',
]);

const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function resolveBuildRun({
  github,
  owner,
  repo,
  headSha,
  label,
  notFoundHint,
  workflowId = 'build.yml',
  requiredJobs = [],
  timeoutMs = DEFAULT_TIMEOUT_MS,
  sleepMs = DEFAULT_POLL_INTERVAL_MS,
  now = Date.now,
  sleep = defaultSleep,
  log,
}) {
  if (!headSha) {
    throw new Error(`Cannot resolve ${label} build without a commit SHA.`);
  }

  const deadline = now() + timeoutMs;

  while (true) {
    // Don't pass `status: 'success'`: that API filter has been observed to
    // omit completed, successful runs that the plain `head_sha` query returns.
    const { data } = await github.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowId,
      head_sha: headSha,
      per_page: 20,
    });
    const runs = data.workflow_runs.filter(
      candidate => candidate.head_sha === headSha,
    );
    const run =
      runs.find(candidate => candidate.conclusion === 'success') ??
      (await findRunWithRequiredJobs({
        github,
        owner,
        repo,
        runs,
        requiredJobs,
      }));
    if (run) {
      log?.(`Found ${label} build run ${run.id} (${run.html_url})`);
      return run;
    }

    const unexpectedRun = data.workflow_runs.find(
      candidate => candidate.head_sha !== headSha,
    );
    if (unexpectedRun) {
      log?.(
        `Ignoring ${label} build run ${unexpectedRun.id}: expected ${headSha}, got ${unexpectedRun.head_sha}.`,
      );
    }

    // Every matching run has failed for good: waiting longer can't help (a
    // re-run of the build needs a re-run of this job too). Any other state,
    // such as a fork build awaiting approval (`action_required`), keeps
    // waiting until the deadline.
    if (runs.length > 0 && runs.every(hasFailedForGood)) {
      // The API lists runs newest first.
      const latest = runs[0];
      throw new Error(
        `${workflowId} run ${latest.id} for ${label} finished without success (conclusion: ${latest.conclusion}) — ${latest.html_url}`,
      );
    }

    if (now() >= deadline) {
      throw new Error(
        `No successful ${workflowId} run found for ${label} within ${timeoutMs / 60_000} min — ${notFoundHint}.`,
      );
    }

    log?.(
      `No successful ${label} build run yet — sleeping ${sleepMs / 1000}s.`,
    );
    await sleep(sleepMs);
  }
}

function hasFailedForGood(run) {
  return run.status === 'completed' && TERMINAL_FAILURES.has(run.conclusion);
}

// The caller only needs the artifacts from `requiredJobs`, so a run qualifies
// as soon as those jobs succeed, even while slow unrelated jobs (e.g. the
// macOS `mobile` build) are still queued or have failed.
async function findRunWithRequiredJobs({
  github,
  owner,
  repo,
  runs,
  requiredJobs,
}) {
  if (requiredJobs.length === 0) {
    return undefined;
  }
  for (const run of runs) {
    // Not started yet: approval is pending.
    if (run.conclusion === 'action_required') {
      continue;
    }
    const { data } = await github.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: run.id,
      filter: 'latest',
      per_page: 100,
    });
    const succeeded = new Set(
      data.jobs
        .filter(job => job.conclusion === 'success')
        .map(job => job.name),
    );
    if (requiredJobs.every(name => succeeded.has(name))) {
      return run;
    }
  }
  return undefined;
}
