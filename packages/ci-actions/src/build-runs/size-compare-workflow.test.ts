import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, it } from 'vitest';

describe('size-compare workflow', () => {
  let workflow: string;

  beforeAll(async () => {
    workflow = await readFile(
      new URL(
        '../../../../.github/workflows/size-compare.yml',
        import.meta.url,
      ),
      'utf8',
    );
  });

  function getStep(name: string) {
    const marker = `- name: ${name}`;
    const start = workflow.indexOf(marker);
    const nextStep = workflow.indexOf('\n      - name:', start + marker.length);

    expect(start).toBeGreaterThan(-1);

    return {
      start,
      contents: workflow.slice(
        start,
        nextStep === -1 ? workflow.length : nextStep,
      ),
    };
  }

  it('loads executable helpers from the trusted event base', () => {
    const baseShaExpression = `\${{ github.event.pull_request.base.sha }}`;
    const checkoutStep = getStep('Checkout base revision');
    const setupStep = getStep('Set up environment');
    const resolverStep = getStep('Resolve build runs');

    expect(setupStep.start).toBeGreaterThan(checkoutStep.start);
    expect(resolverStep.start).toBeGreaterThan(setupStep.start);
    expect(checkoutStep.contents).toContain(`ref: ${baseShaExpression}`);
    expect(setupStep.contents).toContain('uses: ./.github/actions/setup');
    expect(resolverStep.contents).toContain(
      'packages/ci-actions/src/build-runs/resolve.mjs',
    );
    expect(resolverStep.contents).toContain(`BASE_SHA: ${baseShaExpression}`);
  });

  it('resolves and logs the exact event base as the baseline', () => {
    const resolverStep = getStep('Resolve build runs').contents;

    expect(resolverStep).toMatch(
      /resolveBuildRun\(\{\s+\.\.\.common,\s+label: `\$\{baseRef\} base \$\{baseSha\}`,\s+headSha: baseSha,\s+notFoundHint: `\$\{baseRef\} may be broken`,\s+\}\)/,
    );
    expect(resolverStep).toMatch(
      /core\.info\(`Using baseline commit \$\{baseSha\}\.`\);/,
    );
    expect(resolverStep).toContain(
      "core.setOutput('base_run_id', baseRun.id);",
    );
  });
});
