import { describe, expect, it } from 'vitest';

import {
  absolutizeLinks,
  buildNewsFeed,
  parsePost,
  parseReleases,
  slugifyHeading,
  summarize,
} from './parse.mjs';

const siteUrl = 'https://actualbudget.org';

const releasesMarkdown = `# Release Notes

## 26.8.1

Release date: 2026-08-07

This hotfix resolves some performance issues reported in 26.8.0.

**Docker Tag: 26.8.1**

<!-- release-notes:auto-generated -->

#### Bugfixes

- [#8628](https://github.com/actualbudget/actual/pull/8628) Fix freezes — thanks @someone

## 26.8.0

Release date: 2026-08-02

This release promotes [Payee Locations](../../docs/transactions/payee-locations) to stable.

- Age of Money report released
- Day-level date ranges in [reports](/docs/reports/)

**Docker Tag: 26.8.0**

<!-- release-notes:auto-generated -->

#### Features

- [#8540](https://github.com/actualbudget/actual/pull/8540) Promote Age of Money — thanks @youngcw

## 26.5.1 & 26.5.2

Release date: 2026-05-08

This patch release delivers bugfixes.

**Note:** versions 26.5.1 and 26.5.2 are functionally identical.

**Docker Tag: 26.5.1 / 26.5.2**

#### Bugfixes

- [#7707](https://github.com/actualbudget/actual/pull/7707) Count only failed logins — thanks @danielhopkins

## 25.1.0

No date on this one.

#### Bugfixes

- something
`;

describe('slugifyHeading', () => {
  it('mirrors the docs heading anchors', () => {
    expect(slugifyHeading('26.8.1')).toBe('2681');
    expect(slugifyHeading('26.5.1 & 26.5.2')).toBe('2651--2652');
  });
});

describe('absolutizeLinks', () => {
  it('resolves relative and root-relative links and leaves absolute ones', () => {
    const input =
      '[a](../../docs/transactions/payee-locations) [b](/docs/reports/) [c](https://example.com) [d](#anchor) ![img](./img/x.png)';
    expect(absolutizeLinks(input, siteUrl, '/docs/releases')).toBe(
      '[a](https://actualbudget.org/docs/transactions/payee-locations) [b](https://actualbudget.org/docs/reports) [c](https://example.com) [d](#anchor) ![img](https://actualbudget.org/docs/img/x.png)',
    );
  });
});

describe('summarize', () => {
  it('returns the first paragraph as plain text', () => {
    expect(
      summarize('## Heading\n\nSome **bold** [link](x) text.\n\nMore'),
    ).toBe('Some bold link text.');
  });

  it('truncates long paragraphs', () => {
    const summary = summarize('word '.repeat(100), 50);
    expect(summary.length).toBeLessThanOrEqual(50);
    expect(summary.endsWith('…')).toBe(true);
  });
});

describe('parseReleases', () => {
  it('parses release sections with and without the auto-generated sentinel', () => {
    const warnings = [];
    const releases = parseReleases(releasesMarkdown, {
      siteUrl,
      warn: message => warnings.push(message),
    });

    expect(releases.map(release => release.id)).toEqual([
      'release-26.8.1',
      'release-26.8.0',
      'release-26.5.1',
    ]);
    expect(warnings).toEqual([
      'Skipping release "25.1.0": no "Release date:" line found',
    ]);

    const [hotfix, release, combined] = releases;

    expect(hotfix).toMatchObject({
      type: 'release',
      title: 'Release 26.8.1',
      date: '2026-08-07',
      version: '26.8.1',
      url: 'https://actualbudget.org/docs/releases#2681',
      summary:
        'This hotfix resolves some performance issues reported in 26.8.0.',
      body: 'This hotfix resolves some performance issues reported in 26.8.0.',
    });

    expect(release.body).toBe(
      `This release promotes [Payee Locations](https://actualbudget.org/docs/transactions/payee-locations) to stable.

- Age of Money report released
- Day-level date ranges in [reports](https://actualbudget.org/docs/reports)`,
    );
    expect(release.body).not.toContain('Docker Tag');
    expect(release.body).not.toContain('####');
    expect(release.details).toBe(
      `#### Features

- [#8540](https://github.com/actualbudget/actual/pull/8540) Promote Age of Money — thanks @youngcw`,
    );
    expect(hotfix.details).toContain('#### Bugfixes');
    expect(hotfix.details).not.toContain('release-notes:auto-generated');

    expect(combined).toMatchObject({
      title: 'Release 26.5.1 & 26.5.2',
      version: '26.5.1',
      url: 'https://actualbudget.org/docs/releases#2651--2652',
    });
    expect(combined.body).toContain('functionally identical');
    expect(combined.body).not.toContain('Docker Tag');
    expect(combined.body).not.toContain('#7707');
    expect(combined.details).toContain('#7707');
  });

  it('honours the limit', () => {
    expect(parseReleases(releasesMarkdown, { siteUrl, limit: 1 })).toHaveLength(
      1,
    );
  });
});

describe('parsePost', () => {
  const post = `---
title: 'Design Competition: Reimagine the Sidenav'
description: The sidenav is getting some love.
date: 2026-06-27T10:00
slug: design-competition-sidenav
tags: [announcement]
authors: MatissJanis
---

Intro paragraph with a [link](./2026-08-05-sidenav-voting-open.md) and [docs](/docs/settings).

<!--truncate-->

## Details

More text.
`;

  it('parses front matter, rewrites links and strips the truncate marker', () => {
    const entry = parsePost('2026-07-27-design-competition-sidenav.md', post, {
      siteUrl,
      allPostFilenames: [
        '2026-07-27-design-competition-sidenav.md',
        '2026-08-05-sidenav-voting-open.md',
      ],
    });

    expect(entry).toMatchObject({
      id: 'post-design-competition-sidenav',
      type: 'post',
      title: 'Design Competition: Reimagine the Sidenav',
      date: '2026-06-27',
      url: 'https://actualbudget.org/blog/design-competition-sidenav',
      summary: 'The sidenav is getting some love.',
      tags: ['announcement'],
    });
    expect(entry.body).not.toContain('truncate');
    expect(entry.body).toContain(
      '[link](https://actualbudget.org/blog/sidenav-voting-open)',
    );
    expect(entry.body).toContain(
      '[docs](https://actualbudget.org/docs/settings)',
    );
  });

  it('falls back to the filename for the date and slug', () => {
    const entry = parsePost(
      '2024-03-25-automate-twist.md',
      `---
title: Automate
---

Body text.
`,
      { siteUrl },
    );
    expect(entry).toMatchObject({
      id: 'post-automate-twist',
      date: '2024-03-25',
      url: 'https://actualbudget.org/blog/automate-twist',
      summary: 'Body text.',
    });
  });

  it('skips release announcements, drafts and undated posts', () => {
    const warnings = [];
    expect(
      parsePost(
        '2026-08-08-release-26-8-1.md',
        `---
title: Release 26.8.1
date: 2026-08-07
tags: [announcement, release]
---
x`,
        { siteUrl },
      ),
    ).toBeUndefined();
    expect(
      parsePost(
        '2026-08-08-something.md',
        `---
title: Draft
draft: true
---
x`,
        { siteUrl },
      ),
    ).toBeUndefined();
    expect(
      parsePost(
        'welcome.md',
        `---
title: Welcome
---
x`,
        { siteUrl, warn: message => warnings.push(message) },
      ),
    ).toBeUndefined();
    expect(warnings).toEqual([
      'Skipping post "welcome.md": no date in front matter or filename',
    ]);
  });
});

describe('buildNewsFeed', () => {
  function release(version, date) {
    return { id: `release-${version}`, type: 'release', version, date };
  }
  function post(slug, date) {
    return { id: `post-${slug}`, type: 'post', date };
  }

  it('merges, sorts newest first and caps each type', () => {
    const feed = buildNewsFeed({
      releases: [
        release('1.0.0', '2026-01-01'),
        release('3.0.0', '2026-03-01'),
        release('2.0.0', '2026-02-01'),
      ],
      posts: [post('a', '2026-03-01'), post('b', '2026-02-15')],
      generatedAt: '2026-08-27T00:00:00.000Z',
      releaseLimit: 2,
      postLimit: 1,
    });

    expect(feed.schemaVersion).toBe(1);
    expect(feed.generatedAt).toBe('2026-08-27T00:00:00.000Z');
    expect(feed.entries.map(entry => entry.id)).toEqual([
      'release-3.0.0',
      'post-a',
      'release-2.0.0',
    ]);
  });
});
