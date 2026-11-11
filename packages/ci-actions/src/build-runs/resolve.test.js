import { describe, expect, it, vi } from 'vitest';

import { resolveBuildRun } from './resolve.mjs';

const SHA = 'adf5d198282218f06ce0a6cbe847bee66f483332';

function makeRun(id, overrides = {}) {
  return {
    id,
    head_sha: SHA,
    status: 'completed',
    conclusion: 'success',
    html_url: `https://github.com/actualbudget/actual/actions/runs/${id}`,
    ...overrides,
  };
}

function listing(...runs) {
  return { data: { workflow_runs: runs } };
}

function jobs(...entries) {
  return {
    data: {
      jobs: entries.map(([name, status, conclusion]) => ({
        name,
        status,
        conclusion,
      })),
    },
  };
}

function resolve(
  listWorkflowRuns,
  { listJobsForWorkflowRun = vi.fn(), ...overrides } = {},
) {
  return resolveBuildRun({
    github: { rest: { actions: { listWorkflowRuns, listJobsForWorkflowRun } } },
    owner: 'actualbudget',
    repo: 'actual',
    headSha: SHA,
    label: 'PR head',
    notFoundHint: 'build may still be running',
    timeoutMs: 1_000,
    sleep: vi.fn(),
    ...overrides,
  });
}

describe('resolveBuildRun', () => {
  it('selects the exact commit and rejects a stale API result', async () => {
    const staleRun = makeRun(30768952310, {
      head_sha: '4e5c0d5f87f1c4277b12a1811023a03db9ccb4b8',
    });
    const expectedRun = makeRun(32157684269);
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValue(listing(staleRun, expectedRun));
    const sleep = vi.fn();

    const run = await resolve(listWorkflowRuns, { sleep });

    expect(run).toBe(expectedRun);
    expect(listWorkflowRuns).toHaveBeenCalledOnce();
    expect(listWorkflowRuns.mock.calls[0][0]).not.toHaveProperty('branch');
    expect(sleep).not.toHaveBeenCalled();
  });

  // The API's `status=success` filter has been seen to drop runs that the
  // unfiltered `head_sha` query returns as completed/success (e.g. build run
  // 42831671550), so the resolver must filter on `conclusion` itself.
  it('does not rely on the API status filter', async () => {
    const listWorkflowRuns = vi.fn().mockResolvedValue(listing(makeRun(1)));

    await resolve(listWorkflowRuns);

    expect(listWorkflowRuns).toHaveBeenCalledWith({
      owner: 'actualbudget',
      repo: 'actual',
      workflow_id: 'build.yml',
      head_sha: SHA,
      per_page: 20,
    });
  });

  it('prefers a successful run over a newer failed one', async () => {
    const success = makeRun(1);
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValue(
        listing(makeRun(2, { conclusion: 'failure' }), success),
      );

    await expect(resolve(listWorkflowRuns)).resolves.toBe(success);
  });

  it('keeps waiting while a matching run is still in progress', async () => {
    const success = makeRun(1);
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValueOnce(listing())
      .mockResolvedValueOnce(
        listing(makeRun(1, { status: 'in_progress', conclusion: null })),
      )
      .mockResolvedValueOnce(listing(success));
    const sleep = vi.fn();

    await expect(resolve(listWorkflowRuns, { sleep })).resolves.toBe(success);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('keeps waiting when a failed run has a newer queued run', async () => {
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValueOnce(
        listing(
          makeRun(2, { status: 'queued', conclusion: null }),
          makeRun(1, { conclusion: 'cancelled' }),
        ),
      )
      .mockResolvedValueOnce(listing(makeRun(2)));
    const sleep = vi.fn();

    const run = await resolve(listWorkflowRuns, { sleep });

    expect(run.id).toBe(2);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it('keeps waiting when an older run is in progress and a newer one failed', async () => {
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValueOnce(
        listing(
          makeRun(2, { conclusion: 'failure' }),
          makeRun(1, { status: 'in_progress', conclusion: null }),
        ),
      )
      .mockResolvedValueOnce(
        listing(makeRun(2, { conclusion: 'failure' }), makeRun(1)),
      );

    await expect(resolve(listWorkflowRuns)).resolves.toMatchObject({ id: 1 });
  });

  // Fork PR builds awaiting maintainer approval are reported as
  // `status: completed, conclusion: action_required` (e.g. build run
  // 41249789330); approval can still produce a successful build.
  it('keeps waiting on a build that awaits approval', async () => {
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValueOnce(
        listing(makeRun(1, { conclusion: 'action_required' })),
      )
      .mockResolvedValueOnce(listing(makeRun(1)));
    const sleep = vi.fn();

    await expect(resolve(listWorkflowRuns, { sleep })).resolves.toMatchObject({
      id: 1,
    });
    expect(sleep).toHaveBeenCalledOnce();
  });

  // Only known-terminal failures fail fast; anything else (awaiting approval,
  // a missing conclusion, a conclusion GitHub adds later) waits it out.
  it.each([
    ['no matching run ever appears', listing()],
    [
      'a build is never approved',
      listing(makeRun(1, { conclusion: 'action_required' })),
    ],
    [
      'a completed run has no conclusion',
      listing(makeRun(1, { conclusion: null })),
    ],
    [
      'a run has an unrecognised conclusion',
      listing(makeRun(1, { conclusion: 'something_new' })),
    ],
  ])('times out when %s', async (_, response) => {
    const listWorkflowRuns = vi.fn().mockResolvedValue(response);
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(11);

    await expect(
      resolve(listWorkflowRuns, { timeoutMs: 10, now }),
    ).rejects.toThrow(/No successful build\.yml run found for PR head/);
  });

  it('logs runs for other commits but not matching unfinished ones', async () => {
    const log = vi.fn();
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValueOnce(
        listing(
          makeRun(3, { status: 'in_progress', conclusion: null }),
          makeRun(9, { head_sha: 'other' }),
        ),
      )
      .mockResolvedValueOnce(listing(makeRun(3)));

    await resolve(listWorkflowRuns, { log });

    const messages = log.mock.calls.map(([message]) => message);
    expect(messages).toContainEqual(
      expect.stringMatching(/Ignoring PR head build run 9: .*got other/),
    );
    expect(messages).not.toContainEqual(
      expect.stringMatching(/Ignoring .* run 3/),
    );
  });

  it.each([
    'failure',
    'cancelled',
    'timed_out',
    'skipped',
    'stale',
    'startup_failure',
  ])(
    'fails immediately when every matching run finished with %s',
    async conclusion => {
      const listWorkflowRuns = vi
        .fn()
        .mockResolvedValue(listing(makeRun(7, { conclusion })));
      const sleep = vi.fn();

      await expect(resolve(listWorkflowRuns, { sleep })).rejects.toThrow(
        /build\.yml run 7 for PR head finished without success/,
      );
      expect(listWorkflowRuns).toHaveBeenCalledOnce();
      expect(sleep).not.toHaveBeenCalled();
    },
  );

  it('ignores finished runs for other commits when deciding to fail', async () => {
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValueOnce(
        listing(makeRun(9, { head_sha: 'other', conclusion: 'failure' })),
      )
      .mockResolvedValueOnce(listing(makeRun(1)));

    await expect(resolve(listWorkflowRuns)).resolves.toMatchObject({ id: 1 });
  });

  it('rejects a missing commit SHA without querying', async () => {
    const listWorkflowRuns = vi.fn();

    await expect(resolve(listWorkflowRuns, { headSha: '' })).rejects.toThrow(
      /without a commit SHA/,
    );
    expect(listWorkflowRuns).not.toHaveBeenCalled();
  });

  describe('with requiredJobs', () => {
    const requiredJobs = ['web', 'api'];

    // Build run 41909458917 had every stats artifact by 20:46 but only
    // succeeded at 22:10 because the macOS `mobile` job queued for over an
    // hour; the compare job (41909454254) timed out at 21:14.
    it('accepts an in-progress run once the required jobs succeed', async () => {
      const inProgress = makeRun(5, {
        status: 'in_progress',
        conclusion: null,
      });
      const listWorkflowRuns = vi.fn().mockResolvedValue(listing(inProgress));
      const listJobsForWorkflowRun = vi
        .fn()
        .mockResolvedValue(
          jobs(
            ['web', 'completed', 'success'],
            ['api', 'completed', 'success'],
            ['mobile', 'queued', null],
          ),
        );
      const sleep = vi.fn();

      await expect(
        resolve(listWorkflowRuns, {
          listJobsForWorkflowRun,
          requiredJobs,
          sleep,
        }),
      ).resolves.toBe(inProgress);
      expect(listJobsForWorkflowRun).toHaveBeenCalledWith({
        owner: 'actualbudget',
        repo: 'actual',
        run_id: 5,
        filter: 'latest',
        per_page: 100,
      });
      expect(sleep).not.toHaveBeenCalled();
    });

    it('accepts a failed run whose required jobs succeeded', async () => {
      const failed = makeRun(5, { conclusion: 'failure' });
      const listWorkflowRuns = vi.fn().mockResolvedValue(listing(failed));
      const listJobsForWorkflowRun = vi
        .fn()
        .mockResolvedValue(
          jobs(
            ['web', 'completed', 'success'],
            ['api', 'completed', 'success'],
            ['mobile', 'completed', 'failure'],
          ),
        );

      await expect(
        resolve(listWorkflowRuns, { listJobsForWorkflowRun, requiredJobs }),
      ).resolves.toBe(failed);
    });

    it('keeps waiting while a required job is unfinished', async () => {
      const listWorkflowRuns = vi
        .fn()
        .mockResolvedValueOnce(
          listing(makeRun(5, { status: 'in_progress', conclusion: null })),
        )
        .mockResolvedValueOnce(listing(makeRun(5)));
      const listJobsForWorkflowRun = vi
        .fn()
        .mockResolvedValue(
          jobs(['web', 'completed', 'success'], ['api', 'in_progress', null]),
        );
      const sleep = vi.fn();

      await expect(
        resolve(listWorkflowRuns, {
          listJobsForWorkflowRun,
          requiredJobs,
          sleep,
        }),
      ).resolves.toMatchObject({ id: 5 });
      expect(sleep).toHaveBeenCalledOnce();
    });

    it('does not accept a run missing a required job', async () => {
      const listWorkflowRuns = vi
        .fn()
        .mockResolvedValue(listing(makeRun(5, { conclusion: 'failure' })));
      const listJobsForWorkflowRun = vi
        .fn()
        .mockResolvedValue(jobs(['web', 'completed', 'success']));

      await expect(
        resolve(listWorkflowRuns, { listJobsForWorkflowRun, requiredJobs }),
      ).rejects.toThrow(/run 5 for PR head finished without success/);
    });

    it('fails fast when a required job failed and the run finished', async () => {
      const listWorkflowRuns = vi
        .fn()
        .mockResolvedValue(listing(makeRun(5, { conclusion: 'failure' })));
      const listJobsForWorkflowRun = vi
        .fn()
        .mockResolvedValue(
          jobs(
            ['web', 'completed', 'failure'],
            ['api', 'completed', 'success'],
          ),
        );
      const sleep = vi.fn();

      await expect(
        resolve(listWorkflowRuns, {
          listJobsForWorkflowRun,
          requiredJobs,
          sleep,
        }),
      ).rejects.toThrow(/finished without success/);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('skips the jobs lookup for successful runs', async () => {
      const listWorkflowRuns = vi.fn().mockResolvedValue(listing(makeRun(5)));
      const listJobsForWorkflowRun = vi.fn();

      await resolve(listWorkflowRuns, { listJobsForWorkflowRun, requiredJobs });

      expect(listJobsForWorkflowRun).not.toHaveBeenCalled();
    });

    it('skips the jobs lookup for builds awaiting approval', async () => {
      const listWorkflowRuns = vi
        .fn()
        .mockResolvedValueOnce(
          listing(makeRun(5, { conclusion: 'action_required' })),
        )
        .mockResolvedValueOnce(listing(makeRun(5)));
      const listJobsForWorkflowRun = vi.fn();

      await resolve(listWorkflowRuns, { listJobsForWorkflowRun, requiredJobs });

      expect(listJobsForWorkflowRun).not.toHaveBeenCalled();
    });

    it('never looks up jobs when no jobs are required', async () => {
      const listWorkflowRuns = vi
        .fn()
        .mockResolvedValue(listing(makeRun(5, { conclusion: 'failure' })));
      const listJobsForWorkflowRun = vi.fn();

      await expect(
        resolve(listWorkflowRuns, { listJobsForWorkflowRun, requiredJobs: [] }),
      ).rejects.toThrow(/finished without success/);
      expect(listJobsForWorkflowRun).not.toHaveBeenCalled();
    });
  });
});
