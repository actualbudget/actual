// Validates a pull-request description against .github/PULL_REQUEST_TEMPLATE.md.
// Shared by CI (.github/workflows/pr-description.yml) and the agent hook
// (scripts/agent-hooks/pr-description.sh), so it must stay dependency-free.

export const MAX_WORDS = 150;

export const BOT_BOUNDARY_MARKER = '<!--- actual-bot-sections --->';
const REQUIRED_SECTIONS = [
  'Human Summary',
  'Description',
  'Related issue(s)',
  'Testing',
  'Proof',
  'Checklist',
];
// App code is any source file under packages/ that isn't in a tooling package,
// a test or build config. Changes to it must come with proof. The package list
// is a deny-list on purpose: a new package needs proof until it is added here.
const SOURCE_FILE = /^packages\/.*\.([cm]?[jt]sx?|s?css|sql|pegjs|html)$/;
const TOOLING_PACKAGE =
  /^packages\/(docs|ci-actions|eslint-plugin-actual|vite-plugin-peggy)\//;
const TEST_OR_CONFIG =
  /\.(test|spec|stories|config)\.|\/(e2e|tests|__tests__|mocks|__mocks__)\//;
const IMAGE = /!\[[^\]]*\]\([^)]*\)|<img\b[^>]*>/gi;
// GitHub renders an uploaded video from its bare link. Images use the same
// links, so strip them before testing for this.
const VIDEO = /<video\b|github\.com\/user-attachments\//i;
const NOTHING_TO_SHOW = /\[x\] This change has no user-visible effect/i;

// Headings are compared without emoji, punctuation or case, so "## 👱 Human
// Summary" and "## human summary" are the same section.
function normalize(heading) {
  return heading.toLowerCase().replace(/[^a-z]/g, '');
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * @param {string} body PR description
 * @param {{ isAgent?: boolean, changedFiles?: string[] }} [options]
 *   `isAgent` checks a description an AI agent is about to submit: the
 *   human-only parts must still be blank. Otherwise it is the description on
 *   the PR itself.
 * @returns {string[]} problems found; empty when the description is valid
 */
export function checkPrDescription(
  body,
  { isAgent = false, changedFiles = [] } = {},
) {
  // Drop bot-appended sections and template placeholder comments, including
  // an unterminated one: GitHub hides everything after it as well.
  const text = body
    .split(BOT_BOUNDARY_MARKER)[0]
    .replace(/<!--[\s\S]*?(-->|$)/g, '');

  const sections = new Map();
  let current = null;
  let inCodeBlock = false;
  for (const line of text.split(/\r?\n/)) {
    // A "## Heading" inside a fenced code block is an example, not a section.
    if (/^\s*(```|~~~)/.test(line)) inCodeBlock = !inCodeBlock;
    const heading = !inCodeBlock && line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = normalize(heading[1]);
      sections.set(current, '');
    } else if (current) {
      sections.set(current, sections.get(current) + line + '\n');
    }
  }

  const missing = REQUIRED_SECTIONS.filter(
    name => !sections.has(normalize(name)),
  );
  if (missing.length > 0) {
    return [
      `Missing section(s): ${missing.map(name => `"## ${name}"`).join(', ')}. Keep every heading from .github/PULL_REQUEST_TEMPLATE.md.`,
    ];
  }

  const section = name => sections.get(normalize(name)).trim();
  const errors = [];

  const humanSummary = section('Human Summary');
  if (isAgent) {
    if (humanSummary) {
      errors.push(
        'Leave the "Human Summary" section empty: the human author writes it in their own words.',
      );
    }
    if (/\[x\]/i.test(section('Checklist'))) {
      errors.push(
        'Leave every "Checklist" box unchecked: the human author ticks them.',
      );
    }
  } else if (!humanSummary) {
    errors.push(
      'The "Human Summary" section is empty. Write a sentence or two, in your own words, on why this change is needed.',
    );
  }

  const words = countWords(section('Description') + ' ' + section('Testing'));
  if (words > MAX_WORDS) {
    errors.push(
      `The "Description" and "Testing" sections are ${words} words long; keep them to ${MAX_WORDS} words in total.`,
    );
  }

  const changesApp = changedFiles.some(
    file =>
      SOURCE_FILE.test(file) &&
      !TOOLING_PACKAGE.test(file) &&
      !TEST_OR_CONFIG.test(file),
  );
  // Checked on the PR only: the hook sees the body before files are attached.
  if (!isAgent && changesApp) {
    const proof = section('Proof');
    const hasProof =
      (proof.match(IMAGE)?.length ?? 0) >= 2 ||
      VIDEO.test(proof.replace(IMAGE, '')) ||
      NOTHING_TO_SHOW.test(proof);
    if (!hasProof) {
      errors.push(
        'This PR changes app code but has no proof that it works. Verify the change in a real browser and add a before AND an after screenshot, or a video, to the "Proof" section. Only tick the "no user-visible effect" box if there is truly nothing to show.',
      );
    }
  }

  return errors;
}
