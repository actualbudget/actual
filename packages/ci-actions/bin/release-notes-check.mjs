import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import { promisify } from 'node:util';

import matter from 'gray-matter';

import {
  categoryAutocorrections,
  categoryOrder,
} from '../src/release-notes/util.mjs';

const exec = promisify(childProcess.exec);

const NOTES_DIR = 'upcoming-release-notes';

console.log('Looking in ' + fs.realpathSync(NOTES_DIR));

const baseRef = process.env.BASE_REF;
if (!baseRef) {
  console.log('::error::BASE_REF env var is not set');
  process.exit(1);
}

function reportError(message) {
  console.log(`::error::${message}`);

  process.stdout.write('::notice::');
  fs.createReadStream(`${NOTES_DIR}/README.md`).pipe(process.stdout);

  fs.createReadStream(`${NOTES_DIR}/README.md`)
    .pipe(fs.createWriteStream(process.env.GITHUB_STEP_SUMMARY))
    .on('close', () => {
      process.exit(1);
    });
}

function validateFile(path) {
  const { data, content } = matter(fs.readFileSync(path, 'utf-8'));

  if (!data.category) {
    reportError(`Release note ${path} is missing a category.`);
    return false;
  }
  const category = categoryAutocorrections[data.category] ?? data.category;
  if (!categoryOrder.includes(category)) {
    reportError(
      `Release note ${path} category "${data.category}" is not one of ${categoryOrder
        .map(JSON.stringify)
        .join(', ')}`,
    );
    return false;
  }

  if (!data.authors) {
    reportError(`Release note ${path} is missing authors.`);
    return false;
  }
  if (!Array.isArray(data.authors)) {
    reportError(`Release note ${path} authors should be a list.`);
    return false;
  }

  if (content.trim().split('\n').length !== 1) {
    reportError(`Release note ${path} body should contain exactly one line`);
    return false;
  }

  return true;
}

void (async () => {
  await exec(`git fetch origin ${baseRef}`);
  const { stdout } = await exec(
    `git diff --name-only --diff-filter=A origin/${baseRef}...HEAD -- ${NOTES_DIR}/`,
  );
  const added = stdout
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(p => p.endsWith('.md') && p !== `${NOTES_DIR}/README.md`);

  if (added.length === 0) {
    reportError(
      `No release note added under ${NOTES_DIR}/. Add a *.md file describing your change.`,
    );
    return;
  }

  for (const path of added) {
    if (!fs.existsSync(path)) {
      reportError(`Release note ${path} was added but does not exist on HEAD.`);
      return;
    }
    if (!validateFile(path)) {
      return;
    }
  }

  console.log(`Validated ${added.length} release note(s). \u{1f389}`);
})();
