import { describe, expect, test } from 'vitest';

import {
  addTagsToNotes,
  addTagToNotes,
  filterExistingNoteTags,
  removeAllTagsFromNotes,
  removeTagFromNotes,
  removeTagsFromNotes,
  toggleSelectedNoteTag,
} from './tagUtils';

describe('note tag utilities', () => {
  test('adds a hashtag to empty notes', () => {
    expect(addTagToNotes(null, 'travel')).toBe('#travel');
    expect(addTagToNotes('', '#travel')).toBe('#travel');
  });

  test('adds a hashtag after existing note text', () => {
    expect(addTagToNotes('Coffee with Alex', 'meal')).toBe(
      'Coffee with Alex #meal',
    );
  });

  test('does not duplicate an existing hashtag', () => {
    expect(addTagToNotes('Coffee #meal', 'meal')).toBe('Coffee #meal');
    expect(addTagToNotes('Coffee #meal', '#meal')).toBe('Coffee #meal');
  });

  test('removes a hashtag without disturbing other note text', () => {
    expect(removeTagFromNotes('Coffee #meal with Alex #travel', 'meal')).toBe(
      'Coffee with Alex #travel',
    );
  });

  test('removes repeated hashtags and trims whitespace', () => {
    expect(removeTagFromNotes('  #meal Coffee  #meal  ', '#meal')).toBe(
      'Coffee',
    );
  });

  test('does not remove partial hashtag matches', () => {
    expect(removeTagFromNotes('Coffee #mealprep #meal', 'meal')).toBe(
      'Coffee #mealprep',
    );
  });

  test('removes every hashtag from notes', () => {
    expect(removeAllTagsFromNotes('Coffee #meal with #alex #travel')).toBe(
      'Coffee with',
    );
  });

  test('adds multiple hashtags as separate note tokens', () => {
    expect(addTagsToNotes('Coffee', ['meal', '#travel'])).toBe(
      'Coffee #meal #travel',
    );
  });

  test('removes multiple hashtags as separate note tokens', () => {
    expect(
      removeTagsFromNotes('Coffee #meal #travel #fun', ['meal', 'fun']),
    ).toBe('Coffee #travel');
  });

  test('toggles selected tags by normalized tag identity', () => {
    expect(toggleSelectedNoteTag(['meal'], '#meal')).toEqual([]);
    expect(toggleSelectedNoteTag(['meal'], ' travel ')).toEqual([
      'meal',
      'travel',
    ]);
  });

  test('filters existing tags by normalized input text', () => {
    const tags = ['groceries', 'travel', 'meal'];

    expect(filterExistingNoteTags(tags, 'TR')).toEqual(['travel']);
    expect(filterExistingNoteTags(tags, '#')).toEqual(tags);
  });
});
