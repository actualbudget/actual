import { describe, expect, test } from 'vitest';

import { addTagToNotes, removeTagFromNotes } from './tagUtils';

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
});
