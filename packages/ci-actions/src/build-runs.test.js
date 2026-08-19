import { readFile } from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

import { resolveBuildRun } from './build-runs.mjs';

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
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValueOnce({ data: { workflow_runs: [staleRun] } })
      .mockResolvedValueOnce({ data: { workflow_runs: [expectedRun] } });
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
    expect(listWorkflowRuns).toHaveBeenCalledTimes(2);
    expect(listWorkflowRuns).toHaveBeenCalledWith({
      owner: 'actualbudget',
      repo: 'actual',
      workflow_id: 'build.yml',
      head_sha: expectedSha,
      status: 'success',
      per_page: 1,
    });
    expect(listWorkflowRuns.mock.calls[0][0]).not.toHaveProperty('branch');
    expect(sleep).toHaveBeenCalledOnce();
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

  it('wires the workflow base lookup to the pull request base SHA', async () => {
    const workflow = await readFile(
      new URL('../../../.github/workflows/size-compare.yml', import.meta.url),
      'utf8',
    );
    const baseShaExpression = `${String.fromCharCode(36)}{{ github.event.pull_request.base.sha }}`;

    expect(workflow).toContain(`BASE_SHA: ${baseShaExpression}`);
    expect(workflow).toContain('const baseSha = process.env.BASE_SHA');
    expect(workflow).toContain('headSha: baseSha');
    expect(workflow).not.toContain('filter: { branch: baseRef }');
  });
});
