import { describe, expect, it, vi } from 'vitest';

import { resolveBuildRun, resolveComparisonBaseRun } from './resolve.mjs';

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

describe('resolveComparisonBaseRun', () => {
  const owner = 'actualbudget';
  const repo = 'actual';
  const baseRef = 'master';
  // PR #8746 was 49 base-branch commits behind when this regression was found.
  const baseSha = 'e98ddcdfa44e8a4bb80399063899a5b8b1efb760';
  const headSha = '9ef7774dba12f719b6faf5a6512b4697f812ee0e';
  const mergeBaseSha = '4e5c0d5f87f1c4277b12a1811023a03db9ccb4b8';

  function makeGithub(listWorkflowRuns) {
    return {
      rest: {
        actions: { listWorkflowRuns },
        repos: {
          compareCommitsWithBasehead: vi.fn().mockResolvedValue({
            data: { merge_base_commit: { sha: mergeBaseSha } },
          }),
        },
      },
    };
  }

  it('uses the merge-base build when one exists', async () => {
    const mergeBaseRun = {
      id: 30768952310,
      head_sha: mergeBaseSha,
      html_url:
        'https://github.com/actualbudget/actual/actions/runs/30768952310',
    };
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValue({ data: { workflow_runs: [mergeBaseRun] } });
    const github = makeGithub(listWorkflowRuns);

    const result = await resolveComparisonBaseRun({
      github,
      owner,
      repo,
      baseRef,
      baseSha,
      headSha,
    });

    expect(github.rest.repos.compareCommitsWithBasehead).toHaveBeenCalledWith({
      owner,
      repo,
      basehead: `${baseSha}...${headSha}`,
    });
    expect(listWorkflowRuns).toHaveBeenCalledOnce();
    expect(listWorkflowRuns.mock.calls[0][0].head_sha).toBe(mergeBaseSha);
    expect(result).toEqual({ run: mergeBaseRun, sha: mergeBaseSha });
  });

  it('falls back to the event base when the merge base has no build', async () => {
    const baseRun = {
      id: 32020833563,
      head_sha: baseSha,
      html_url:
        'https://github.com/actualbudget/actual/actions/runs/32020833563',
    };
    const listWorkflowRuns = vi
      .fn()
      .mockResolvedValueOnce({ data: { workflow_runs: [] } })
      .mockResolvedValueOnce({ data: { workflow_runs: [baseRun] } });
    const github = makeGithub(listWorkflowRuns);
    const warning = vi.fn();

    const result = await resolveComparisonBaseRun({
      github,
      owner,
      repo,
      baseRef,
      baseSha,
      headSha,
      warning,
    });

    expect(listWorkflowRuns).toHaveBeenCalledTimes(2);
    expect(
      listWorkflowRuns.mock.calls.map(([options]) => options.head_sha),
    ).toEqual([mergeBaseSha, baseSha]);
    expect(warning).toHaveBeenCalledWith(
      `No build for merge base ${mergeBaseSha}; falling back to ${baseSha}.`,
    );
    expect(result).toEqual({ run: baseRun, sha: baseSha });
  });

  it('does not hide API failures behind the fallback', async () => {
    const apiError = new Error('GitHub API unavailable');
    const listWorkflowRuns = vi.fn().mockRejectedValue(apiError);
    const github = makeGithub(listWorkflowRuns);

    await expect(
      resolveComparisonBaseRun({
        github,
        owner,
        repo,
        baseRef,
        baseSha,
        headSha,
      }),
    ).rejects.toBe(apiError);
    expect(listWorkflowRuns).toHaveBeenCalledOnce();
  });
});
