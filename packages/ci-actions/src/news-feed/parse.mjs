// Pure helpers that turn the docs release notes page and blog posts into the
// in-app news feed (`news.json`). No I/O happens here so everything can be
// unit tested; `packages/docs/scripts/generate-news-feed.mjs` does the reading
// and writing.

import matter from 'gray-matter';

// Must match `NEWS_FEED_SCHEMA_VERSION` in
// packages/desktop-client/src/news/types.ts. The app rejects feeds with any
// other version, so bumping this breaks "What's new" for every already
// deployed client until they update - only do it for incompatible changes.
export const NEWS_FEED_SCHEMA_VERSION = 1;

const AUTO_GENERATED_SENTINEL = '<!-- release-notes:auto-generated -->';
const RELEASE_DATE_PATTERN = /^Release date:\s*(\d{4}-\d{2}-\d{2})\s*$/m;
const DOCKER_TAG_PATTERN = /^\*\*Docker Tag:.*\*\*\s*$/gm;
const CATEGORY_HEADING_PATTERN = /^#### /m;
// Complete comments, plus the abruptly-closed forms `<!-->` and `<!--->`.
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->|<!--->|<!-->/g;
// An unterminated comment runs to the end of the input.
const UNTERMINATED_HTML_COMMENT_PATTERN = /<!--[\s\S]*$/;
const DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})-(.+)$/;

const ignoreWarning = () => undefined;

/**
 * Removes HTML comments. A single `.replace` isn't enough: overlapping markers
 * such as `<!-<!---->-` collapse into a fresh `<!--` after one pass (CodeQL
 * `js/incomplete-multi-character-sanitization`), so we repeat until the text
 * stops changing.
 */
export function stripHtmlComments(markdown) {
  let previous;
  let current = markdown;
  do {
    previous = current;
    current = current.replace(HTML_COMMENT_PATTERN, '');
  } while (current !== previous);
  return current.replace(UNTERMINATED_HTML_COMMENT_PATTERN, '');
}

/**
 * Mirrors the GitHub/Docusaurus heading slugger closely enough for release
 * headings such as `26.8.1` (-> `2681`) and `26.5.1 & 26.5.2` (-> `2651--2652`).
 */
export function slugifyHeading(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/ /g, '-');
}

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

/**
 * Rewrites relative markdown links to absolute URLs so they work inside the
 * app. `basePath` is the site path the source document lives at (e.g.
 * `/docs/releases`) and is used to resolve `../` style links; links starting
 * with `/` resolve against the site root.
 *
 * Only handles the common `[text](target)` / `![alt](target "title")` shapes -
 * nested brackets in the text or `)` inside the target are left untouched.
 */
export function absolutizeLinks(
  markdown,
  siteUrl,
  basePath,
  warn = ignoreWarning,
) {
  const site = trimTrailingSlash(siteUrl);
  return markdown.replace(
    /(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g,
    (match, prefix, target, suffix) => {
      if (/^(?:[a-z]+:|#|mailto:)/i.test(target)) {
        return match;
      }
      let resolved;
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

function cleanReleaseMarkdown(markdown) {
  return stripHtmlComments(markdown.replace(DOCKER_TAG_PATTERN, ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Splits a release section into the hand-written highlights (everything
 * before the Docker tag / auto-generated marker / first category heading) and
 * the detailed, categorized list of changes that follows.
 */
function splitReleaseSection(sectionBody) {
  const withoutDate = sectionBody.replace(RELEASE_DATE_PATTERN, '');
  const boundaries = [
    withoutDate.indexOf(AUTO_GENERATED_SENTINEL),
    withoutDate.search(DOCKER_TAG_PATTERN),
    withoutDate.search(CATEGORY_HEADING_PATTERN),
  ].filter(index => index >= 0);
  const end = boundaries.length > 0 ? Math.min(...boundaries) : undefined;
  return {
    highlights: cleanReleaseMarkdown(withoutDate.slice(0, end)),
    details:
      end === undefined ? '' : cleanReleaseMarkdown(withoutDate.slice(end)),
  };
}

/**
 * Parses `docs/releases.md` into release entries, newest first.
 */
export function parseReleases(
  markdown,
  { siteUrl, limit, warn = ignoreWarning },
) {
  const sections = markdown.split(/^## (.+)$/m);
  const entries = [];

  // sections[0] is the preamble; afterwards heading/body pairs alternate.
  for (let index = 1; index < sections.length; index += 2) {
    const heading = sections[index].trim();
    const body = sections[index + 1] ?? '';
    const dateMatch = body.match(RELEASE_DATE_PATTERN);
    if (!dateMatch) {
      warn(`Skipping release "${heading}": no "Release date:" line found`);
      continue;
    }

    // Combined headings like `26.5.1 & 26.5.2` are keyed by the first version.
    const versions = heading.split(/\s*&\s*/).map(version => version.trim());
    const section = splitReleaseSection(body);

    entries.push({
      id: `release-${versions[0]}`,
      type: 'release',
      title: `Release ${heading}`,
      date: dateMatch[1],
      version: versions[0],
      url: `${trimTrailingSlash(siteUrl)}/docs/releases#${slugifyHeading(heading)}`,
      body: absolutizeLinks(
        section.highlights,
        siteUrl,
        '/docs/releases',
        warn,
      ),
      details: absolutizeLinks(
        section.details,
        siteUrl,
        '/docs/releases',
        warn,
      ),
    });

    if (limit !== undefined && entries.length >= limit) {
      break;
    }
  }

  return entries;
}

function postSlugFromFilename(filename) {
  const base = filename.replace(/\.mdx?$/, '');
  const match = base.match(DATE_PREFIX_PATTERN);
  return match ? match[2] : base;
}

function postDateFromFilename(filename) {
  const match = filename.match(DATE_PREFIX_PATTERN);
  return match ? match[1] : undefined;
}

function normalizeDate(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const asString =
    value instanceof Date ? value.toISOString() : String(value).trim();
  const match = asString.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

function cleanPostBody(content, siteUrl, slugsByFilename, warn) {
  // Links between posts use the source filename; map them to the public slug.
  const withResolvedPostLinks = content.replace(
    /(\[[^\]]*\]\()\.\/([^)\s#]+\.mdx?)(#[^)\s]*)?\)/g,
    (match, prefix, filename, hash = '') => {
      const slug = slugsByFilename.get(filename);
      const target = slug ? `/blog/${slug}` : '/blog';
      return `${prefix}${trimTrailingSlash(siteUrl)}${target}${hash})`;
    },
  );
  // MDX `import` lines and capitalised JSX components (`<Tabs>`) are dropped;
  // plain lowercase HTML is left alone and renders as text in the app.
  const withoutMdx = stripHtmlComments(
    withResolvedPostLinks.replace(/^import\s.+$/gm, ''),
  ).replace(/<\/?[A-Z][A-Za-z]*[^>]*>/g, '');
  return absolutizeLinks(withoutMdx, siteUrl, '/blog/', warn)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parses a single blog post. Returns `undefined` when the post should not be
 * part of the feed (release announcements duplicate `releases.md`, drafts, or
 * posts without a resolvable date).
 */
export function parsePost(
  filename,
  contents,
  { siteUrl, allPostFilenames = [filename], warn = ignoreWarning },
) {
  const { data, content } = matter(contents);
  const tags = Array.isArray(data.tags) ? data.tags : [];

  if (
    tags.includes('release') ||
    data.draft === true ||
    data.unlisted === true
  ) {
    return undefined;
  }

  const date = normalizeDate(data.date) ?? postDateFromFilename(filename);
  if (!date) {
    warn(`Skipping post "${filename}": no date in front matter or filename`);
    return undefined;
  }

  const slugsByFilename = new Map(
    allPostFilenames.map(name => [name, postSlugFromFilename(name)]),
  );
  const slug = data.slug ?? postSlugFromFilename(filename);

  return {
    id: `post-${slug}`,
    type: 'post',
    title: String(data.title ?? slug),
    date,
    url: `${trimTrailingSlash(siteUrl)}/blog/${slug}`,
    body: cleanPostBody(content, siteUrl, slugsByFilename, warn),
    tags,
  };
}

function compareEntries(entryA, entryB) {
  if (entryA.date !== entryB.date) {
    return entryA.date < entryB.date ? 1 : -1;
  }
  if (entryA.type !== entryB.type) {
    return entryA.type === 'release' ? -1 : 1;
  }
  return 0;
}

export function buildNewsFeed({
  releases,
  posts,
  generatedAt,
  releaseLimit = 10,
  postLimit = 10,
}) {
  const newestReleases = [...releases]
    .sort(compareEntries)
    .slice(0, releaseLimit);
  const newestPosts = [...posts].sort(compareEntries).slice(0, postLimit);

  return {
    schemaVersion: NEWS_FEED_SCHEMA_VERSION,
    generatedAt,
    entries: [...newestReleases, ...newestPosts].sort(compareEntries),
  };
}
