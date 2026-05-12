import { describe, expect, it } from 'vitest';

import {
  createNoteTagRegex,
  createNoteTagsRegex,
  getNoteTags,
  normalizeNoteTag,
  noteHasTag,
} from './note-tags';

describe('note tags', () => {
  it('normalizes user-entered tags', () => {
    expect(normalizeNoteTag('  ##travel tag  ')).toBe('traveltag');
  });

  it('extracts inline note tags', () => {
    expect(getNoteTags('memo#travel paid #work')).toEqual(['travel', 'work']);
  });

  it('does not treat repeated hash prefixes as note tags', () => {
    expect(getNoteTags('memo##travel paid ###work')).toEqual([]);
  });

  it('matches exact note tags without matching partial tags', () => {
    expect(noteHasTag('memo#travel paid', 'travel')).toBe(true);
    expect(noteHasTag('memo#traveling #travel', 'travel')).toBe(true);
    expect(noteHasTag('memo#traveling paid', 'travel')).toBe(false);
  });

  it('creates a regex for matching every note tag', () => {
    expect('memo#travel paid #work'.replace(createNoteTagsRegex(), '')).toBe(
      'memo paid ',
    );
  });

  it('creates a regex for matching one exact note tag', () => {
    expect(
      'memo#travel paid #work'.replace(createNoteTagRegex('travel'), ''),
    ).toBe('memo paid #work');
  });
});
