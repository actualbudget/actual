import * as Platform from '@actual-app/core/shared/platform';

import { newsFeedFixture } from './fixtures';
import { NEWS_FEED_SCHEMA_VERSION } from './types';
import type { NewsEntry, NewsFeed } from './types';

// Released builds read the file committed on `master`, the same way the custom
// theme catalog is fetched (hooks/useThemeCatalog.ts).
const REPO_NEWS_FEED_URL =
  'https://raw.githubusercontent.com/actualbudget/actual/master/packages/desktop-client/src/data/news.json';

/**
 * Where to load `news.json` from, in priority order:
 *
 * 1. `REACT_APP_NEWS_FEED_URL` - explicit override, e.g. in a local `.env`
 *    file in `packages/desktop-client`.
 * 2. Netlify PR previews (`REACT_APP_REVIEW_ID` is set) serve the copy in
 *    their own build, i.e. exactly the file committed on the PR branch. This
 *    also works for PRs from forks, whose branches aren't on GitHub upstream.
 * 3. The committed file on `master`.
 */
export async function getNewsFeedUrl(): Promise<string> {
  const override = import.meta.env.REACT_APP_NEWS_FEED_URL;
  if (override) {
    return override;
  }

  if (import.meta.env.REACT_APP_REVIEW_ID) {
    // `?url` makes Vite emit the file as a static asset and hand back its URL.
    const { default: bundledUrl } = await import('../data/news.json?url');
    return bundledUrl;
  }

  return REPO_NEWS_FEED_URL;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isNewsEntry(value: unknown): value is NewsEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.type === 'release' || value.type === 'post') &&
    typeof value.title === 'string' &&
    typeof value.date === 'string' &&
    typeof value.url === 'string' &&
    typeof value.body === 'string' &&
    isOptionalString(value.version) &&
    isOptionalString(value.details)
  );
}

/** Runtime shape check on the untrusted JSON we fetched. */
function isNewsFeed(value: unknown): value is NewsFeed {
  return (
    isRecord(value) &&
    value.schemaVersion === NEWS_FEED_SCHEMA_VERSION &&
    Array.isArray(value.entries) &&
    value.entries.every(isNewsEntry)
  );
}

export async function fetchNewsFeed(): Promise<NewsFeed> {
  if (Platform.isPlaywright) {
    return newsFeedFixture;
  }

  const response = await fetch(await getNewsFeedUrl());
  if (!response.ok) {
    throw new Error(`Failed to load news feed (HTTP ${response.status})`);
  }

  const json: unknown = await response.json();
  if (!isNewsFeed(json)) {
    throw new Error('Unsupported news feed format');
  }
  return json;
}
