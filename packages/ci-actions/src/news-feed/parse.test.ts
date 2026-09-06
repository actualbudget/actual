import { describe, expect, it } from 'vitest';

import {
  absolutizeLinks,
  buildNewsFeed,
  getPostSlug,
  parsePost,
  stripHtmlComments,
} from './parse';
import type { NewsEntry } from './parse';

const siteUrl = 'https://actualbudget.org';

describe('stripHtmlComments', () => {
  it('removes comments, including nested or overlapping markers', () => {
    expect(stripHtmlComments('a <!-- x --> b')).toBe('a  b');
    expect(stripHtmlComments('a <!-<!---->-> b')).toBe('a  b');
    expect(stripHtmlComments('<!--<!-- x -->-->')).toBe('-->');
    expect(stripHtmlComments('a <!-- unterminated')).toBe('a ');
    expect(stripHtmlComments('no comments')).toBe('no comments');
  });
});

describe('absolutizeLinks', () => {
  it('resolves relative and root-relative links and leaves absolute ones', () => {
    const input =
      '[a](../../docs/transactions/payee-locations) [b](/docs/reports/) [c](https://example.com) [d](#anchor) ![img](./img/x.png) [e](//example.com/page) [f](mailto:hi@example.com)';
    expect(absolutizeLinks(input, siteUrl, '/blog/')).toBe(
      '[a](https://actualbudget.org/docs/transactions/payee-locations) [b](https://actualbudget.org/docs/reports) [c](https://example.com) [d](#anchor) ![img](https://actualbudget.org/blog/img/x.png) [e](//example.com/page) [f](mailto:hi@example.com)',
    );
  });

  it('leaves links it cannot parse alone and warns', () => {
    const warnings: string[] = [];
    expect(
      // Two backslashes resolve like `//` but aren't caught by the
      // protocol-relative check, giving an invalid host that throws.
      absolutizeLinks('[x](\\\\[)', siteUrl, '/blog/', message =>
        warnings.push(message),
      ),
    ).toBe('[x](\\\\[)');
    expect(warnings).toEqual(['Leaving unparseable link "\\\\[" as-is']);
  });
});

describe('parsePost', () => {
  describe('release posts', () => {
    const releasePost = `---
title: Release 26.8.0
description: New release of Actual.
date: 2026-08-02T10:00
slug: release-26.8.0
tags: [announcement, release]
in_app_notification: true
authors: matt-fidd
---

This release promotes [Payee Locations](../../docs/transactions/payee-locations) to stable.

- Age of Money report released
- Day-level date ranges in [reports](/docs/reports/)

<!--truncate-->

**Docker Tag: 26.8.0**

<!-- release-notes:auto-generated -->

#### Features

- [#8540](https://github.com/actualbudget/actual/pull/8540) Promote Age of Money — thanks @youngcw
`;

    it('splits highlights from the categorized changes', () => {
      const entry = parsePost('2026-08-02-release-26-8-0.md', releasePost, {
        siteUrl,
      });

      expect(entry).toMatchObject({
        id: 'release-26.8.0',
        type: 'release',
        title: 'Release 26.8.0',
        date: '2026-08-02',
        version: '26.8.0',
        url: 'https://actualbudget.org/blog/release-26.8.0',
      });
      expect(entry?.body).toBe(
        `This release promotes [Payee Locations](https://actualbudget.org/docs/transactions/payee-locations) to stable.

- Age of Money report released
- Day-level date ranges in [reports](https://actualbudget.org/docs/reports)`,
      );
      expect(entry?.details).toBe(
        `#### Features

- [#8540](https://github.com/actualbudget/actual/pull/8540) Promote Age of Money — thanks @youngcw`,
      );
      expect(entry?.body).not.toContain('Docker Tag');
      expect(entry?.details).not.toContain('Docker Tag');
      expect(entry?.details).not.toContain('release-notes:auto-generated');
    });

    it('handles older posts without the auto-generated marker', () => {
      const entry = parsePost(
        '2026-05-08-release-26-5-1.md',
        `---
title: Release 26.5.1 & 26.5.2
date: 2026-05-08T10:00
slug: release-26.5.1
tags: [announcement, release]
in_app_notification: true
---

This patch release delivers bugfixes.

**Docker Tag: 26.5.1 / 26.5.2**

#### Bugfixes

- [#7707](https://github.com/actualbudget/actual/pull/7707) Count only failed logins — thanks @danielhopkins
`,
        { siteUrl },
      );

      expect(entry).toMatchObject({
        id: 'release-26.5.1',
        title: 'Release 26.5.1 & 26.5.2',
        version: '26.5.1',
        body: 'This patch release delivers bugfixes.',
      });
      expect(entry?.details).toContain('#7707');
    });

    it('fails on release posts with an unexpected slug', () => {
      expect(() =>
        parsePost(
          '2026-08-02-release-26-8-0.md',
          releasePost.replace('slug: release-26.8.0', 'slug: big-release'),
          { siteUrl },
        ),
      ).toThrow(
        'Release post "2026-08-02-release-26-8-0.md" has an unexpected slug "big-release"',
      );
    });
  });

  describe('other posts', () => {
    const post = `---
title: 'Design Competition: Reimagine the Sidenav'
description: The sidenav is getting some love.
date: 2026-06-27T10:00
slug: design-competition-sidenav
tags: [announcement]
in_app_notification: true
authors: MatissJanis
---

Intro paragraph with a [link](./2026-08-05-sidenav-voting-open.md) and [docs](/docs/settings).

<!--truncate-->

## Details

More text.
`;

    it('parses front matter, rewrites links and strips the truncate marker', () => {
      const entry = parsePost(
        '2026-07-27-design-competition-sidenav.md',
        post,
        {
          siteUrl,
          postSlugs: new Map([
            [
              '2026-07-27-design-competition-sidenav.md',
              'design-competition-sidenav',
            ],
            ['2026-08-05-sidenav-voting-open.md', 'sidenav-voting-open'],
          ]),
        },
      );

      expect(entry).toMatchObject({
        id: 'post-design-competition-sidenav',
        type: 'post',
        title: 'Design Competition: Reimagine the Sidenav',
        date: '2026-06-27',
        url: 'https://actualbudget.org/blog/design-competition-sidenav',
      });
      expect(entry?.body).not.toContain('truncate');
      expect(entry?.body).toContain(
        '[link](https://actualbudget.org/blog/sidenav-voting-open)',
      );
      expect(entry?.body).toContain(
        '[docs](https://actualbudget.org/docs/settings)',
      );
    });

    it('resolves links to posts that use a custom slug', () => {
      const target = `---
title: Automate
slug: 2023-12-15-automate-your-budget-with-goal-templates
---
x`;
      const postSlugs = new Map([
        [
          '2023-12-15-automate.md',
          getPostSlug('2023-12-15-automate.md', target),
        ],
        ['2024-03-25-twist.md', 'twist'],
      ]);
      const entry = parsePost(
        '2024-03-25-twist.md',
        `---
title: Twist
in_app_notification: true
---

Start [here](./2023-12-15-automate.md#month-ahead).
`,
        { siteUrl, postSlugs },
      );
      expect(entry?.body).toBe(
        'Start [here](https://actualbudget.org/blog/2023-12-15-automate-your-budget-with-goal-templates#month-ahead).',
      );
    });

    it('drops a leading H1 that duplicates the title', () => {
      const entry = parsePost(
        '2026-01-17-next-steps.md',
        `---
title: Next Steps
in_app_notification: true
---

# Next Steps

Intro.

## Later heading

# Not a leading heading
`,
        { siteUrl },
      );
      expect(entry?.body).toBe(
        'Intro.\n\n## Later heading\n\n# Not a leading heading',
      );
    });

    it('falls back to the filename for the date and slug', () => {
      const entry = parsePost(
        '2024-03-25-automate-twist.md',
        `---
title: Automate
in_app_notification: true
---

Body text.
`,
        { siteUrl },
      );
      expect(entry).toMatchObject({
        id: 'post-automate-twist',
        date: '2024-03-25',
        url: 'https://actualbudget.org/blog/automate-twist',
        body: 'Body text.',
      });
    });

    it('skips posts that are not marked for the app', () => {
      expect(
        parsePost(
          '2026-08-08-unmarked.md',
          `---
title: Unmarked
---
x`,
          { siteUrl },
        ),
      ).toBeUndefined();
      expect(
        parsePost(
          '2026-08-08-opted-out.md',
          `---
title: Opted out
in_app_notification: false
---
x`,
          { siteUrl },
        ),
      ).toBeUndefined();
    });

    it('skips drafts and fails on undated posts', () => {
      expect(
        parsePost(
          '2026-08-08-something.md',
          `---
title: Draft
draft: true
in_app_notification: true
---
x`,
          { siteUrl },
        ),
      ).toBeUndefined();
      expect(() =>
        parsePost(
          'welcome.md',
          `---
title: Welcome
in_app_notification: true
---
x`,
          { siteUrl },
        ),
      ).toThrow('Post "welcome.md" is marked for the app but has no date');
    });
  });
});

describe('buildNewsFeed', () => {
  function release(version: string, date: string): NewsEntry {
    return {
      id: `release-${version}`,
      type: 'release',
      title: `Release ${version}`,
      date,
      version,
      url: '',
      body: '',
    };
  }
  function post(slug: string, date: string): NewsEntry {
    return {
      id: `post-${slug}`,
      type: 'post',
      title: slug,
      date,
      url: '',
      body: '',
    };
  }

  it('sorts newest first and caps releases and posts separately', () => {
    const feed = buildNewsFeed({
      entries: [
        post('b', '2026-02-15'),
        release('1.0.0', '2026-01-01'),
        release('3.0.0', '2026-03-01'),
        post('a', '2026-03-01'),
        release('2.0.0', '2026-02-01'),
      ],
      releaseLimit: 2,
      postLimit: 1,
    });

    expect(feed.schemaVersion).toBe(1);
    expect(feed.entries.map(entry => entry.id)).toEqual([
      'release-3.0.0',
      'post-a',
      'release-2.0.0',
    ]);
  });
});
