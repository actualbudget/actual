import { describe, expect, it, vi } from 'vitest';

import { resolveBuildRun } from './resolve.mjs';

describe('resolveBuildRun', () => {
  it('selects the exact commit and rejects a stale API result', async () => {
    const expectedSha = 'adf5d198282218f06ce0a6cbe847bee66f483332';
    const staleRun = {
      id: 30768952310,
      head_sha: '4e5c0d5f87f1c4277b12a1811023a03db9ccb4b8',
      html_url:
        'https://github.com/actualbudget/actual/actions/runs/30768952310',
    };
    const expectedRun = {
      id: 32157684269,
      head_sha: expectedSha,
      html_url:
        'https://github.com/actualbudget/actual/actions/runs/32157684269',
    };
    const listWorkflowRuns = vi.fn().mockResolvedValue({
      data: { workflow_runs: [staleRun, expectedRun] },
    });
    const sleep = vi.fn();

    const run = await resolveBuildRun({
      github: { rest: { actions: { listWorkflowRuns } } },
      owner: 'actualbudget',
      repo: 'actual',
      headSha: expectedSha,
      label: 'master base',
      notFoundHint: 'master may be broken',
      timeoutMs: 1_000,
      sleep,
    });

    expect(run).toBe(expectedRun);
    expect(listWorkflowRuns).toHaveBeenCalledOnce();
    expect(listWorkflowRuns).toHaveBeenCalledWith({
      owner: 'actualbudget',
      repo: 'actual',
      workflow_id: 'build.yml',
      head_sha: expectedSha,
      status: 'success',
      per_page: 20,
    });
    expect(listWorkflowRuns.mock.calls[0][0]).not.toHaveProperty('branch');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('fails when no successful run exists for the commit', async () => {
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValue({ data: { workflow_runs: [] } });
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(11);

    await expect(
      resolveBuildRun({
        github: { rest: { actions: { listWorkflowRuns } } },
        owner: 'actualbudget',
        repo: 'actual',
        headSha: 'base-sha',
        label: 'master base',
        notFoundHint: 'master may be broken',
        timeoutMs: 10,
        now,
      }),
    ).rejects.toThrow(/No successful build\.yml run found for master base/);
  });
});
