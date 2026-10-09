import { describe, expect, it } from 'vitest';

import { countChanges, splitChangelog } from './changelog';

describe('splitChangelog', () => {
  it('splits the details into categories and counts their changes', () => {
    const details = `#### Features

- [#1](https://example.com/1) Add a thing
- [#2](https://example.com/2) Add another thing
  that wraps onto a second line

#### Bugfixes

- [#3](https://example.com/3) Fix a thing`;

    expect(splitChangelog(details)).toEqual({
      preamble: '',
      sections: [
        {
          title: 'Features',
          markdown:
            '- [#1](https://example.com/1) Add a thing\n- [#2](https://example.com/2) Add another thing\n  that wraps onto a second line',
          changeCount: 2,
        },
        {
          title: 'Bugfixes',
          markdown: '- [#3](https://example.com/3) Fix a thing',
          changeCount: 1,
        },
      ],
    });
  });

  it('keeps text written before the first category as a preamble', () => {
    const changelog = splitChangelog(
      'A note about this release.\n\n#### Maintenance\n\n- Tidy up',
    );

    expect(changelog.preamble).toBe('A note about this release.');
    expect(changelog.sections.map(section => section.title)).toEqual([
      'Maintenance',
    ]);
  });

  it('returns everything as the preamble when there are no categories', () => {
    expect(splitChangelog('- One\n- Two')).toEqual({
      preamble: '- One\n- Two',
      sections: [],
    });
    expect(splitChangelog('')).toEqual({ preamble: '', sections: [] });
  });
});

describe('countChanges', () => {
  it('counts top-level bullets only', () => {
    expect(countChanges('- One\n  - nested\n* Two\n\nText')).toBe(2);
    expect(countChanges('No list here')).toBe(0);
  });
});
