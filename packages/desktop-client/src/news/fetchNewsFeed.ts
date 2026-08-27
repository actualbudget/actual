import * as Platform from '@actual-app/core/shared/platform';

import { newsFeedFixture } from './fixtures';
import { NEWS_FEED_SCHEMA_VERSION } from './types';
import type { NewsFeed } from './types';

export const DEFAULT_NEWS_FEED_URL = 'https://actualbudget.org/news.json';

/**
 * Where to load `news.json` from, in priority order:
 *
 * 1. `REACT_APP_NEWS_FEED_URL` — explicit override, e.g. in a local `.env`
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

  return DEFAULT_NEWS_FEED_URL;
}

function isNewsFeed(value: unknown): value is NewsFeed {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<NewsFeed>;
  return (
    candidate.schemaVersion === NEWS_FEED_SCHEMA_VERSION &&
    Array.isArray(candidate.entries)
  );
}

export async function fetchNewsFeed(): Promise<NewsFeed> {
  // Keep end-to-end tests and screenshots deterministic.
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
