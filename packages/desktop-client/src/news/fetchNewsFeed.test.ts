import { afterEach, describe, expect, it, vi } from 'vitest';

import { getNewsFeedUrl } from './fetchNewsFeed';

describe('getNewsFeedUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the production docs site', () => {
    vi.stubEnv('REACT_APP_NEWS_FEED_URL', '');
    vi.stubEnv('REACT_APP_REVIEW_ID', '');
    expect(getNewsFeedUrl()).toBe('https://actualbudget.org/news.json');
  });

  it('uses the matching docs deploy preview on PR previews', () => {
    vi.stubEnv('REACT_APP_NEWS_FEED_URL', '');
    vi.stubEnv('REACT_APP_REVIEW_ID', '8802');
    expect(getNewsFeedUrl()).toBe(
      'https://deploy-preview-8802.www.actualbudget.org/news.json',
    );
  });

  it('prefers an explicit override', () => {
    vi.stubEnv('REACT_APP_NEWS_FEED_URL', 'http://localhost:3000/news.json');
    vi.stubEnv('REACT_APP_REVIEW_ID', '8802');
    expect(getNewsFeedUrl()).toBe('http://localhost:3000/news.json');
  });
});
