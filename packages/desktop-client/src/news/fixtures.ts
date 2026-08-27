import type { NewsFeed } from './types';

/**
 * Deterministic feed used in Playwright / preview builds instead of hitting
 * the network, so screenshots and end-to-end tests are stable.
 */
export const newsFeedFixture: NewsFeed = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  entries: [
    {
      id: 'release-99.9.9',
      type: 'release',
      title: 'Release 99.9.9',
      date: '2026-01-01',
      version: '99.9.9',
      url: 'https://actualbudget.org/docs/releases#9999',
      summary: 'A test release used by end-to-end tests.',
      body: 'A test release used by end-to-end tests.\n\n- Adds a fixture release\n- Keeps screenshots stable',
      details:
        '#### Features\n\n- [#1](https://github.com/actualbudget/actual/pull/1) Add a fixture feature — thanks @actual\n\n#### Bugfixes\n\n- [#2](https://github.com/actualbudget/actual/pull/2) Fix a fixture bug — thanks @actual',
    },
    {
      id: 'post-fixture-post',
      type: 'post',
      title: 'A fixture blog post',
      date: '2025-12-01',
      url: 'https://actualbudget.org/blog/fixture-post',
      summary: 'A test announcement used by end-to-end tests.',
      body: 'A test announcement used by end-to-end tests.',
      tags: ['announcement'],
    },
  ],
};
