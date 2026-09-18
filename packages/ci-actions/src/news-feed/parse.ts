// Pure helpers that turn the docs blog posts into the in-app news feed
// (`news.json`). Release announcements are blog posts too (tagged `release`),
// so the blog is the single source. No I/O happens here so everything can be
// unit tested; `packages/ci-actions/bin/generate-news-feed.ts` does the reading
// and writing.

import matter from 'gray-matter';

// Must match `NEWS_FEED_SCHEMA_VERSION` in
// packages/desktop-client/src/news/types.ts. The app rejects feeds with any
// other version, so bumping this breaks in-app notifications for every already
// deployed client until they update - only do it for incompatible changes.
export const NEWS_FEED_SCHEMA_VERSION = 1;

export type NewsEntryType = 'release' | 'post';

export type NewsEntry = {
  id: string;
  type: NewsEntryType;
  title: string;
  /** ISO date (YYYY-MM-DD) the entry was published. */
  date: string;
  /** Only present for `release` entries, e.g. `26.8.1`. */
  version?: string;
  /** Absolute link to the full content on actualbudget.org. */
  url: string;
  /** Markdown body (for releases: the hand-written highlights). */
  body: string;
  /** Releases only: markdown for the full categorized list of changes. */
  details?: string;
};

export type NewsFeed = {
  schemaVersion: number;
  entries: NewsEntry[];
};

type Warn = (message: string) => void;

const AUTO_GENERATED_SENTINEL = '<!-- release-notes:auto-generated -->';
const DOCKER_TAG_PATTERN = /^\*\*Docker Tag:.*\*\*\s*$/gm;
const CATEGORY_HEADING_PATTERN = /^#### /m;
// Complete comments, plus the abruptly-closed forms `<!-->` and `<!--->`.
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->|<!--->|<!-->/g;
// An unterminated comment runs to the end of the input.
const UNTERMINATED_HTML_COMMENT_PATTERN = /<!--[\s\S]*$/;
const DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})-(.+)$/;
// A markdown H1 at the very start of a post. Docusaurus treats it as the page
// title (shown once); the app already shows the front-matter title.
const LEADING_H1_PATTERN = /^\s*#[ \t]+[^\n]*\n/;
// Release posts are generated with `slug: release-X.Y.Z`.
const RELEASE_SLUG_PATTERN = /^release-(\d+\.\d+\.\d+)$/;

const ignoreWarning: Warn = () => undefined;

/**
 * Removes HTML comments. A single `.replace` isn't enough: overlapping markers
 * such as `<!-<!---->-` collapse into a fresh `<!--` after one pass (CodeQL
 * `js/incomplete-multi-character-sanitization`), so we repeat until the text
 * stops changing.
 */
export function stripHtmlComments(markdown: string): string {
  let previous: string;
  let current = markdown;
  do {
    previous = current;
    current = current.replace(HTML_COMMENT_PATTERN, '');
  } while (current !== previous);
  return current.replace(UNTERMINATED_HTML_COMMENT_PATTERN, '');
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Rewrites relative markdown links to absolute URLs so they work inside the
 * app. `basePath` is the site path the source document lives at (e.g.
 * `/blog/`) and is used to resolve `../` style links; links starting with `/`
 * resolve against the site root.
 *
 * Only handles the common `[text](target)` / `![alt](target "title")` shapes -
 * nested brackets in the text or `)` inside the target are left untouched.
 */
export function absolutizeLinks(
  markdown: string,
  siteUrl: string,
  basePath: string,
  warn: Warn = ignoreWarning,
): string {
  const site = trimTrailingSlash(siteUrl);
  return markdown.replace(
    /(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g,
    (match: string, prefix: string, target: string, suffix: string) => {
      // Already absolute (scheme, protocol-relative `//host`, or in-page anchor).
      if (/^(?:[a-z]+:|\/\/|#)/i.test(target)) {
        return match;
      }
      let resolved: URL;
      try {
        resolved = new URL(target, `${site}${basePath}`);
      } catch {
        // A malformed link in the docs shouldn't fail the whole docs build.
        warn(`Leaving unparseable link "${target}" as-is`);
        return match;
      }
      let pathname = resolved.pathname.replace(/\.mdx?$/, '');
      if (pathname !== '/') {
        pathname = trimTrailingSlash(pathname);
      }
      return `${prefix}${site}${pathname}${resolved.hash}${suffix}`;
    },
  );
}

function tidyMarkdown(markdown: string): string {
  return stripHtmlComments(markdown)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Splits a release post's body into the hand-written highlights (everything
 * before the Docker tag / auto-generated marker / first category heading) and
 * the detailed, categorized list of changes that follows.
 */
function splitReleaseBody(body: string) {
  const boundaries = [
    body.indexOf(AUTO_GENERATED_SENTINEL),
    body.search(DOCKER_TAG_PATTERN),
    body.search(CATEGORY_HEADING_PATTERN),
  ].filter(index => index >= 0);
  const end = boundaries.length > 0 ? Math.min(...boundaries) : undefined;
  return {
    highlights: tidyMarkdown(body.slice(0, end)),
    details:
      end === undefined
        ? ''
        : tidyMarkdown(body.slice(end).replace(DOCKER_TAG_PATTERN, '')),
  };
}

function postSlugFromFilename(filename: string): string {
  const base = filename.replace(/\.mdx?$/, '');
  const match = base.match(DATE_PREFIX_PATTERN);
  return match ? match[2] : base;
}

function postDateFromFilename(filename: string): string | undefined {
  const match = filename.match(DATE_PREFIX_PATTERN);
  return match ? match[1] : undefined;
}

function normalizeDate(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const asString =
    value instanceof Date ? value.toISOString() : String(value).trim();
  const match = asString.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

function cleanPostBody(
  content: string,
  siteUrl: string,
  slugsByFilename: Map<string, string>,
): string {
  // Links between posts use the source filename; map them to the public slug.
  const withResolvedPostLinks = content.replace(
    /(\[[^\]]*\]\()\.\/([^)\s#]+\.mdx?)(#[^)\s]*)?\)/g,
    (_match: string, prefix: string, filename: string, hash = '') => {
      const slug = slugsByFilename.get(filename);
      const target = slug ? `/blog/${slug}` : '/blog';
      return `${prefix}${trimTrailingSlash(siteUrl)}${target}${hash})`;
    },
  );
  // MDX `import` lines and capitalised JSX components (`<Tabs>`) are dropped;
  // plain lowercase HTML is left alone and renders as text in the app.
  return withResolvedPostLinks
    .replace(/^import\s.+$/gm, '')
    .replace(/<\/?[A-Z][A-Za-z]*[^>]*>/g, '');
}

/**
 * The public slug of a post: its front-matter `slug` when set, otherwise the
 * filename without the date prefix (Docusaurus' default).
 */
export function getPostSlug(filename: string, contents: string): string {
  const { data } = matter(contents);
  return typeof data.slug === 'string'
    ? data.slug
    : postSlugFromFilename(filename);
}

type ParsePostOptions = {
  siteUrl: string;
  /**
   * Public slug of every post keyed by filename (see `getPostSlug`), used to
   * resolve `./other-post.md` links. Defaults to just this post.
   */
  postSlugs?: Map<string, string>;
  warn?: Warn;
};

/**
 * Parses a single blog post into a feed entry. Returns `undefined` when the
 * post should not be in the feed (not marked `in_app_notification: true`, or a
 * draft). Throws when a post that opted in can't be represented - no
 * resolvable date, or a release post with an unexpected slug - so the feed
 * generator fails instead of silently leaving the post out.
 */
export function parsePost(
  filename: string,
  contents: string,
  { siteUrl, postSlugs, warn = ignoreWarning }: ParsePostOptions,
): NewsEntry | undefined {
  const { data, content } = matter(contents);
  const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : [];

  // Posts are opt-in. The release tooling sets the flag on release posts;
  // authors set it on other posts worth announcing in the app.
  if (
    data.in_app_notification !== true ||
    data.draft === true ||
    data.unlisted === true
  ) {
    return undefined;
  }

  const date = normalizeDate(data.date) ?? postDateFromFilename(filename);
  if (!date) {
    throw new Error(
      `Post "${filename}" is marked for the app but has no date in its front matter or filename`,
    );
  }

  const slug = getPostSlug(filename, contents);
  const slugsByFilename = postSlugs ?? new Map([[filename, slug]]);
  const title = typeof data.title === 'string' ? data.title : slug;
  const url = `${trimTrailingSlash(siteUrl)}/blog/${slug}`;
  const body = cleanPostBody(
    content.replace(LEADING_H1_PATTERN, ''),
    siteUrl,
    slugsByFilename,
  );
  const toAbsolute = (markdown: string) =>
    absolutizeLinks(markdown, siteUrl, '/blog/', warn);

  if (tags.includes('release')) {
    const versionMatch = slug.match(RELEASE_SLUG_PATTERN);
    if (!versionMatch) {
      throw new Error(
        `Release post "${filename}" has an unexpected slug "${slug}" (expected release-X.Y.Z)`,
      );
    }
    const { highlights, details } = splitReleaseBody(body);
    return {
      id: `release-${versionMatch[1]}`,
      type: 'release',
      title,
      date,
      version: versionMatch[1],
      url,
      body: toAbsolute(highlights),
      details: toAbsolute(details),
    };
  }

  return {
    id: `post-${slug}`,
    type: 'post',
    title,
    date,
    url,
    body: toAbsolute(tidyMarkdown(body)),
  };
}

function compareEntries(entryA: NewsEntry, entryB: NewsEntry): number {
  if (entryA.date !== entryB.date) {
    return entryA.date < entryB.date ? 1 : -1;
  }
  if (entryA.type !== entryB.type) {
    return entryA.type === 'release' ? -1 : 1;
  }
  return 0;
}

type BuildNewsFeedOptions = {
  entries: NewsEntry[];
  releaseLimit?: number;
  postLimit?: number;
};

/** Keeps the newest releases and posts (capped separately), newest first. */
export function buildNewsFeed({
  entries,
  releaseLimit = 10,
  postLimit = 10,
}: BuildNewsFeedOptions): NewsFeed {
  const sorted = [...entries].sort(compareEntries);
  const releases = sorted
    .filter(entry => entry.type === 'release')
    .slice(0, releaseLimit);
  const posts = sorted
    .filter(entry => entry.type === 'post')
    .slice(0, postLimit);

  return {
    schemaVersion: NEWS_FEED_SCHEMA_VERSION,
    entries: [...releases, ...posts].sort(compareEntries),
  };
}
