import * as Platform from '@actual-app/core/shared/platform';

import { newsFeedFixture } from './fixtures';
import { NEWS_FEED_SCHEMA_VERSION } from './types';
import type { NewsFeed } from './types';

export const DEFAULT_NEWS_FEED_URL = 'https://actualbudget.org/news.json';

export function getNewsFeedUrl(): string {
  return import.meta.env.REACT_APP_NEWS_FEED_URL || DEFAULT_NEWS_FEED_URL;
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
  if (Platform.isPlaywright || import.meta.env.REACT_APP_REVIEW_ID) {
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
