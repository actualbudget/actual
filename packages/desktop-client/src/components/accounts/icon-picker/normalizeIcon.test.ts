import { describe, expect, it } from 'vitest';

import { emojiToStoredIcon, isEmojiIcon, toDataUrl } from './normalizeIcon';

describe('toDataUrl', () => {
  it('builds a valid data URL', () => {
    expect(toDataUrl('image/png', 'AAAA')).toBe('data:image/png;base64,AAAA');
  });
});

describe('emojiToStoredIcon', () => {
  it('rejects empty input', () => {
    expect(() => emojiToStoredIcon('   ')).toThrow();
  });

  it('rejects non-emoji text', () => {
    expect(() => emojiToStoredIcon('hello')).toThrow();
  });

  it('rejects overly long input', () => {
    expect(() => emojiToStoredIcon('🏦'.repeat(20))).toThrow();
  });

  it('returns the trimmed emoji for storage', () => {
    expect(emojiToStoredIcon('  🏦  ')).toBe('🏦');
  });

  it('accepts multi-codepoint emoji (flags, ZWJ sequences)', () => {
    expect(emojiToStoredIcon('🇳🇿')).toBe('🇳🇿');
    expect(emojiToStoredIcon('👨‍👩‍👧')).toBe('👨‍👩‍👧');
  });
});

describe('isEmojiIcon', () => {
  it('treats raw unicode as an emoji', () => {
    expect(isEmojiIcon('🏦')).toBe(true);
  });

  it('treats data URLs as images', () => {
    expect(isEmojiIcon('data:image/png;base64,AAAA')).toBe(false);
  });
});
