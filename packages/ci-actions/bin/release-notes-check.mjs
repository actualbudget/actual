import * as fs from 'node:fs';

import matter from 'gray-matter';

import {
  categoryAutocorrections,
  categoryOrder,
} from '../src/release-notes/util.mjs';

console.log('Looking in ' + fs.realpathSync('upcoming-release-notes'));

const expectedPath = `upcoming-release-notes/${process.env.PR_NUMBER}.md`;

function reportError(message) {
  console.log(`::error::${message}`);

  process.stdout.write('::notice::');
  fs.createReadStream('upcoming-release-notes/README.md').pipe(process.stdout);

  fs.createReadStream('upcoming-release-notes/README.md')
    .pipe(fs.createWriteStream(process.env.GITHUB_STEP_SUMMARY))
    .on('close', () => {
      process.exit(1);
    });
}

(() => {
  if (!fs.existsSync(expectedPath)) {
    reportError(`Release note file ${expectedPath} not found`);
    return;
  }

  const { data, content } = matter(fs.readFileSync(expectedPath, 'utf-8'));

  if (!data.category) {
    reportError(`Release note is missing a category.`);
    return;
  }
  if (categoryAutocorrections[data.category]) {
    data.category = categoryAutocorrections[data.category];
  }
  if (!categoryOrder.includes(data.category)) {
    reportError(
      `Release note category "${data.category}" is not one of ${categoryOrder
        .map(JSON.stringify)
        .join(', ')}`,
    );
    return;
  }

  if (!data.authors) {
    reportError(`Release note is missing authors.`);
    return;
  }
  if (!Array.isArray(data.authors)) {
    reportError(`Release note authors should be a list.`);
    return;
  }

  if (content.trim().split('\n').length !== 1) {
    reportError(
      `Release note file ${expectedPath} body should contain exactly one line`,
    );
    return;
  }

  console.log('Everything looks good! \u{1f389}');
})();
