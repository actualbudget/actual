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

/**
 * Must match `NEWS_FEED_SCHEMA_VERSION` in
 * packages/ci-actions/src/news-feed/parse.ts. Feeds with any other version
 * are rejected, so the two must be bumped together and only for incompatible
 * changes (older clients would stop showing news until updated).
 */
export const NEWS_FEED_SCHEMA_VERSION = 1;
