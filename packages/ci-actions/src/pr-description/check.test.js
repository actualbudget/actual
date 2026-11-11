import * as fs from 'node:fs';

import { checkPrDescription, MAX_WORDS } from './check.mjs';

const read = path =>
  fs.readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf-8');
const template = read('.github/PULL_REQUEST_TEMPLATE.md');
const APP_FILE = 'packages/desktop-client/src/components/Foo.tsx';

function fill(sections) {
  let body = template;
  for (const [heading, content] of Object.entries(sections)) {
    body = body.replace(
      new RegExp(`^(## .*${heading}.*)$`, 'm'),
      `$1\n\n${content}`,
    );
  }
  return body;
}

describe('checkPrDescription', () => {
  it('accepts the blank template from an agent, but not on the PR', () => {
    expect(checkPrDescription(template, { isAgent: true })).toEqual([]);
    expect(checkPrDescription(template)).toEqual([
      expect.stringContaining('"Human Summary" section is empty'),
    ]);
  });

  it('lets an agent fill in the description but not the human parts', () => {
    const body = fill({ Description: 'Fix the thing.', Testing: 'Ran it.' });
    expect(checkPrDescription(body, { isAgent: true })).toEqual([]);

    expect(
      checkPrDescription(fill({ 'Human Summary': 'I wanted this.' }), {
        isAgent: true,
      }),
    ).toEqual([expect.stringContaining('Leave the "Human Summary"')]);
    expect(
      checkPrDescription(template.replace('- [ ] Release', '- [x] Release'), {
        isAgent: true,
      }),
    ).toEqual([expect.stringContaining('Checklist')]);
  });

  it('ignores headings inside fenced code blocks', () => {
    const body = fill({
      Testing: '```md\n## Human Summary\n\nFrom an example.\n```',
    });
    expect(checkPrDescription(body)).toEqual([
      expect.stringContaining('"Human Summary" section is empty'),
    ]);
  });

  it('does not count hidden comments as a human summary', () => {
    for (const hidden of ['<!-- todo -->', '<!-- never closed']) {
      expect(
        checkPrDescription(fill({ 'Human Summary': hidden }))[0],
      ).toContain('"Human Summary" section is empty');
    }
  });

  it('requires every template heading', () => {
    expect(checkPrDescription('Just some prose')).toEqual([
      expect.stringContaining('Missing section(s): "## Human Summary"'),
    ]);
  });

  it('caps the description and testing length', () => {
    // Every place that states the limit must agree with the validator.
    for (const doc of [
      template,
      read('.github/agents/pr-and-commit-rules.md'),
      read('packages/docs/docs/contributing/ai-usage-policy.md'),
    ]) {
      expect(doc).toContain(`${MAX_WORDS} words`);
    }
    const body = fill({
      'Human Summary': 'I wanted this.',
      Description: 'word '.repeat(MAX_WORDS + 1),
    });
    expect(checkPrDescription(body)).toEqual([
      expect.stringContaining(`${MAX_WORDS + 1} words long`),
    ]);
  });

  it('requires before and after proof, or the opt-out, for app code', () => {
    const summary = { 'Human Summary': 'I wanted this.' };
    const check = (body, changedFiles = [APP_FILE]) =>
      checkPrDescription(body, { changedFiles });
    const noProof = [expect.stringContaining('no proof that it works')];
    const upload = 'https://github.com/user-attachments/assets/abc';

    expect(check(fill(summary))).toEqual(noProof);
    for (const appFile of [
      'packages/loot-core/src/a.ts',
      'packages/desktop-client/src/fonts.scss',
    ]) {
      expect(check(fill(summary), [appFile])).toEqual(noProof);
    }
    for (const exempt of [
      'packages/docs/src/a.tsx',
      'packages/desktop-client/src/Foo.test.tsx',
      'packages/desktop-client/e2e/page-models/a.ts',
      'packages/loot-core/vitest.config.ts',
      'packages/loot-core/README.md',
      '.github/workflows/a.yml',
    ]) {
      expect(check(fill(summary), [exempt])).toEqual([]);
    }

    // One screenshot is not a before and an after.
    expect(check(fill({ ...summary, Proof: `![after](${upload})` }))).toEqual(
      noProof,
    );
    expect(
      check(
        fill({
          ...summary,
          Proof: `![before](${upload})\n![after](${upload})`,
        }),
      ),
    ).toEqual([]);
    expect(check(fill({ ...summary, Proof: upload }))).toEqual([]);
    // Proof must be in its own section.
    expect(check(fill({ ...summary, Testing: upload }))).toEqual(noProof);
    expect(
      check(fill(summary).replace('- [ ] This change', '- [x] This change')),
    ).toEqual([]);
  });

  it('ignores bot-appended sections', () => {
    const body =
      fill({ 'Human Summary': 'I wanted this.' }) +
      '\n## Proof\n\n![a](https://x/a.png)\n![b](https://x/b.png)\n' +
      'word '.repeat(MAX_WORDS * 2);
    expect(checkPrDescription(body, { changedFiles: [APP_FILE] })).toEqual([
      expect.stringContaining('no proof that it works'),
    ]);
  });
});
