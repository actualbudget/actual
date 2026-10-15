import { describe, expect, it } from 'vitest';

import { insertReleaseSection } from './util.mjs';

describe('insertReleaseSection', () => {
  it('inserts below the upcoming release notes partial', () => {
    const releases = `# Release Notes

import UpcomingReleaseNotes from './_upcoming-release-notes.md';

<UpcomingReleaseNotes />

## 26.10.0

Old notes
`;

    expect(insertReleaseSection(releases, '## 26.11.0\n\nNew notes'))
      .toBe(`# Release Notes

import UpcomingReleaseNotes from './_upcoming-release-notes.md';

<UpcomingReleaseNotes />

## 26.11.0

New notes

## 26.10.0

Old notes
`);
  });

  it('inserts below the title when there are no releases yet', () => {
    expect(insertReleaseSection('# Release Notes\n', '## 1.0.0')).toBe(
      '# Release Notes\n\n## 1.0.0\n',
    );
  });
});
