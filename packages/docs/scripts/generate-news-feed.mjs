// Generates `static/news.json` — the feed the Actual app reads to show
// "What's new" inside the app. It combines the highlights of each release in
// `docs/releases.md` with the blog posts in `blog/`. The file is regenerated on
// every docs build and served at https://actualbudget.org/news.json.
//
// This runs before `docusaurus start` / `docusaurus build` (see package.json).
// The parser is TypeScript and is imported directly, relying on Node's
// built-in type stripping (Node 22.18+ / 24, see .nvmrc).

import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildNewsFeed,
  parsePost,
  parseReleases,
} from '@actual-app/ci-actions/src/news-feed/parse.ts';

// On Netlify deploy previews, link to the preview site so pages added in the
// same PR resolve; everywhere else links point at the production docs.
const SITE_URL =
  process.env.CONTEXT === 'deploy-preview' && process.env.DEPLOY_PRIME_URL
    ? process.env.DEPLOY_PRIME_URL
    : 'https://actualbudget.org';
const RELEASE_LIMIT = 10;
const POST_LIMIT = 10;

const docsRoot = fileURLToPath(new URL('..', import.meta.url));
const releasesPath = join(docsRoot, 'docs/releases.md');
const blogDir = join(docsRoot, 'blog');
const outputPath = join(docsRoot, 'static/news.json');

const warn = message => console.warn(message);

const releases = parseReleases(await fs.readFile(releasesPath, 'utf-8'), {
  siteUrl: SITE_URL,
  limit: RELEASE_LIMIT,
  warn,
});

const postFilenames = (await fs.readdir(blogDir)).filter(name =>
  /\.mdx?$/.test(name),
);
const posts = [];
for (const filename of postFilenames) {
  const contents = await fs.readFile(join(blogDir, filename), 'utf-8');
  const entry = parsePost(filename, contents, {
    siteUrl: SITE_URL,
    allPostFilenames: postFilenames,
    warn,
  });
  if (entry) {
    posts.push(entry);
  }
}

const feed = buildNewsFeed({
  releases,
  posts,
  generatedAt: new Date().toISOString(),
  releaseLimit: RELEASE_LIMIT,
  postLimit: POST_LIMIT,
});

await fs.writeFile(outputPath, `${JSON.stringify(feed, null, 2)}\n`);

console.log(
  `Generated ${outputPath} with ${feed.entries.length} entries (${releases.length} release(s), ${posts.length} post(s) considered).`,
);
