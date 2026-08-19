import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, it } from 'vitest';

describe('size-compare workflow', () => {
  let workflow;

  beforeAll(async () => {
    workflow = await readFile(
      new URL(
        '../../../../.github/workflows/size-compare.yml',
        import.meta.url,
      ),
      'utf8',
    );
  });

  it('loads executable helpers from the trusted event base', () => {
    const baseShaExpression = `\${{ github.event.pull_request.base.sha }}`;
    const checkoutIndex = workflow.indexOf(`ref: ${baseShaExpression}`);
    const resolverImportIndex = workflow.indexOf(
      'packages/ci-actions/src/build-runs/resolve.mjs',
    );

    expect(checkoutIndex).toBeGreaterThan(-1);
    expect(resolverImportIndex).toBeGreaterThan(checkoutIndex);
    expect(workflow).toContain(`BASE_SHA: ${baseShaExpression}`);
  });

  it('resolves and logs the exact event base as the baseline', () => {
    expect(workflow).toMatch(
      /resolveBuildRun\(\{\s+\.\.\.common,\s+label: `\$\{baseRef\} base \$\{baseSha\}`,\s+headSha: baseSha,\s+notFoundHint: `\$\{baseRef\} may be broken`,\s+\}\)/,
    );
    expect(workflow).toMatch(
      /core\.info\(`Using baseline commit \$\{baseSha\}\.`\);/,
    );
    expect(workflow).toContain("core.setOutput('base_run_id', baseRun.id);");
  });
});
