// Generates `packages/desktop-client/src/data/news.json` — the feed the Actual
// app reads for in-app notifications — from the blog posts in `packages/docs/blog`
// that are marked `in_app_notification: true` (release announcements get the
// flag from the release tooling; other posts opt in by hand).
//
// The file is committed so it can be reviewed in the PR that adds a post;
// autofix.ci regenerates and commits it on every PR, and the "News feed check"
// workflow fails a PR whose committed copy is stale. The app fetches it from
// the `master` branch on GitHub, the same way as the custom theme catalog.
//
// Run from the repo root: `yarn generate:news-feed`.

import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildNewsFeed, getPostSlug, parsePost } from '../src/news-feed/parse';
import type { NewsEntry } from '../src/news-feed/parse';

const SITE_URL = 'https://actualbudget.org';
const RELEASE_LIMIT = 10;
const POST_LIMIT = 10;

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const blogDir = join(repoRoot, 'packages/docs/blog');
const outputPath = join(repoRoot, 'packages/desktop-client/src/data/news.json');

// Link-rewriting problems are only warned about; an opted-in post that can't
// be represented makes `parsePost` throw, which fails the run (exit code 1).
const warn = (message: string) => console.warn(message);

const postFilenames = (await fs.readdir(blogDir))
  .filter(name => /\.mdx?$/.test(name))
  .sort();
const postContents = new Map<string, string>();
for (const filename of postFilenames) {
  postContents.set(
    filename,
    await fs.readFile(join(blogDir, filename), 'utf-8'),
  );
}
// Links between posts are written against filenames; resolve them to the
// slugs Docusaurus actually publishes (front matter can override the default).
const postSlugs = new Map(
  [...postContents].map(([filename, contents]) => [
    filename,
    getPostSlug(filename, contents),
  ]),
);

const entries: NewsEntry[] = [];
for (const [filename, contents] of postContents) {
  const entry = parsePost(filename, contents, {
    siteUrl: SITE_URL,
    postSlugs,
    warn,
  });
  if (entry) {
    entries.push(entry);
  }
}

const feed = buildNewsFeed({
  entries,
  releaseLimit: RELEASE_LIMIT,
  postLimit: POST_LIMIT,
});

await fs.writeFile(outputPath, `${JSON.stringify(feed, null, 2)}\n`);

const releaseCount = feed.entries.filter(
  entry => entry.type === 'release',
).length;
console.log(
  `Generated ${outputPath} with ${feed.entries.length} entries (${releaseCount} releases, ${feed.entries.length - releaseCount} posts).`,
);
