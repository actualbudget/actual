import type * as PlatformModule from '@actual-app/core/shared/platform';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchNewsFeed, getNewsFeedUrl } from './fetchNewsFeed';
import { newsFeedFixture } from './fixtures';

vi.mock('../data/news.json?url', () => ({ default: '/assets/news.json' }));

vi.mock('@actual-app/core/shared/platform', async () => {
  const actual = await vi.importActual<typeof PlatformModule>(
    '@actual-app/core/shared/platform',
  );
  return { ...actual, isPlaywright: false };
});

describe('getNewsFeedUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the committed file on master', async () => {
    vi.stubEnv('REACT_APP_NEWS_FEED_URL', '');
    vi.stubEnv('REACT_APP_REVIEW_ID', '');
    await expect(getNewsFeedUrl()).resolves.toBe(
      'https://raw.githubusercontent.com/actualbudget/actual/master/packages/desktop-client/src/data/news.json',
    );
  });

  it('serves the bundled copy on PR previews', async () => {
    vi.stubEnv('REACT_APP_NEWS_FEED_URL', '');
    vi.stubEnv('REACT_APP_REVIEW_ID', '8802');
    await expect(getNewsFeedUrl()).resolves.toBe('/assets/news.json');
  });

  it('prefers an explicit override', async () => {
    vi.stubEnv('REACT_APP_NEWS_FEED_URL', 'http://localhost:3000/news.json');
    vi.stubEnv('REACT_APP_REVIEW_ID', '8802');
    await expect(getNewsFeedUrl()).resolves.toBe(
      'http://localhost:3000/news.json',
    );
  });
});

describe('fetchNewsFeed', () => {
  function stubResponse(body: unknown, ok = true) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok,
        status: ok ? 200 : 500,
        json: () => Promise.resolve(body),
      }),
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a well-formed feed', async () => {
    stubResponse(newsFeedFixture);
    await expect(fetchNewsFeed()).resolves.toEqual(newsFeedFixture);
  });

  it('rejects feeds with malformed entries', async () => {
    stubResponse({ schemaVersion: 1, entries: [null] });
    await expect(fetchNewsFeed()).rejects.toThrow(
      'Unsupported news feed format',
    );

    stubResponse({
      ...newsFeedFixture,
      entries: [{ ...newsFeedFixture.entries[0], type: 'other' }],
    });
    await expect(fetchNewsFeed()).rejects.toThrow(
      'Unsupported news feed format',
    );
  });

  it('rejects other schema versions and HTTP errors', async () => {
    stubResponse({ ...newsFeedFixture, schemaVersion: 2 });
    await expect(fetchNewsFeed()).rejects.toThrow(
      'Unsupported news feed format',
    );

    stubResponse(newsFeedFixture, false);
    await expect(fetchNewsFeed()).rejects.toThrow('HTTP 500');
  });
});
