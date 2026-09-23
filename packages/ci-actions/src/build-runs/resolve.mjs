const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 15_000;

const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function resolveBuildRun({
  github,
  owner,
  repo,
  headSha,
  label,
  notFoundHint,
  workflowId = 'build.yml',
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
    const { data } = await github.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowId,
      head_sha: headSha,
      status: 'success',
      per_page: 20,
    });
    const run = data.workflow_runs.find(
      candidate => candidate.head_sha === headSha,
    );

    if (run) {
      log?.(`Found ${label} build run ${run.id} (${run.html_url})`);
      return run;
    }

    const unexpectedRun = data.workflow_runs[0];
    if (unexpectedRun) {
      log?.(
        `Ignoring ${label} build run ${unexpectedRun.id}: expected ${headSha}, got ${unexpectedRun.head_sha}.`,
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
