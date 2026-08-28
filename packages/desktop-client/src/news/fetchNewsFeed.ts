import * as Platform from '@actual-app/core/shared/platform';

import { newsFeedFixture } from './fixtures';
import { NEWS_FEED_SCHEMA_VERSION } from './types';
import type { NewsEntry, NewsFeed } from './types';

const PRODUCTION_NEWS_FEED_URL = 'https://actualbudget.org/news.json';

/**
 * Where to load `news.json` from, in priority order:
 *
 * 1. `REACT_APP_NEWS_FEED_URL` - explicit override, e.g. in a local `.env`
 *    file in `packages/desktop-client` to point at a locally served docs build.
 * 2. Netlify PR previews (`REACT_APP_REVIEW_ID` is set) read the feed built by
 *    the matching docs preview for the same PR.
 * 3. The production docs site.
 */
export function getNewsFeedUrl(): string {
  const override = import.meta.env.REACT_APP_NEWS_FEED_URL;
  if (override) {
    return override;
  }

  const reviewId = import.meta.env.REACT_APP_REVIEW_ID;
  if (reviewId) {
    return `https://deploy-preview-${reviewId}.www.actualbudget.org/news.json`;
  }

  return PRODUCTION_NEWS_FEED_URL;
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
    isOptionalString(value.details) &&
    (value.tags === undefined ||
      (Array.isArray(value.tags) &&
        value.tags.every(tag => typeof tag === 'string')))
  );
}

/** Runtime shape check on the untrusted JSON we fetched. */
function isNewsFeed(value: unknown): value is NewsFeed {
  return (
    isRecord(value) &&
    value.schemaVersion === NEWS_FEED_SCHEMA_VERSION &&
    typeof value.generatedAt === 'string' &&
    Array.isArray(value.entries) &&
    value.entries.every(isNewsEntry)
  );
}

export async function fetchNewsFeed(): Promise<NewsFeed> {
  if (Platform.isPlaywright) {
    return newsFeedFixture;
  }

  const response = await fetch(getNewsFeedUrl());
  if (!response.ok) {
    throw new Error(`Failed to load news feed (HTTP ${response.status})`);
  }

  const json: unknown = await response.json();
  if (!isNewsFeed(json)) {
    throw new Error('Unsupported news feed format');
  }
  return json;
}
