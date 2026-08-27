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
  /** Plain-text one-liner. */
  summary: string;
  /** Markdown body (for releases: the hand-written highlights). */
  body: string;
  /** Releases only: markdown for the full categorized list of changes. */
  details?: string;
  tags?: string[];
};

export type NewsFeed = {
  schemaVersion: number;
  generatedAt: string;
  entries: NewsEntry[];
};

export const NEWS_FEED_SCHEMA_VERSION = 1;
