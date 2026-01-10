import { describe, it, expect, beforeEach, vi } from 'vitest';

import { shortcodeToNative } from './emoji';

// Mock the emoji-mart data
vi.mock('@emoji-mart/data', () => ({
  default: {
    emojis: {
      grinning: {
        id: 'grinning',
        name: 'Grinning Face',
        skins: [{ native: '😀' }],
      },
      '100': {
        id: '100',
        name: 'Hundred Points',
        skins: [{ native: '💯' }],
      },
      'red_circle': {
        id: 'red_circle',
        name: 'Red Circle',
        skins: [{ native: '🔴' }],
      },
      'thumbs_up': {
        id: 'thumbs_up',
        name: 'Thumbs Up',
        skins: [{ native: '👍' }],
      },
    },
  },
}));

describe('emojiUtils', () => {
  beforeEach(() => {
    // Clear the cache before each test to ensure fresh state
    vi.resetModules();
  });

  describe('shortcodeToNative', () => {
    it('converts shortcode with colons to native emoji', () => {
      expect(shortcodeToNative(':grinning:')).toBe('😀');
      expect(shortcodeToNative(':100:')).toBe('💯');
      expect(shortcodeToNative(':red_circle:')).toBe('🔴');
    });

    it('converts shortcode without colons to native emoji', () => {
      expect(shortcodeToNative('grinning')).toBe('😀');
      expect(shortcodeToNative('100')).toBe('💯');
      expect(shortcodeToNative('red_circle')).toBe('🔴');
    });

    it('returns empty string for null input', () => {
      expect(shortcodeToNative(null)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(shortcodeToNative('')).toBe('');
    });

    it('returns original string if shortcode not found', () => {
      expect(shortcodeToNative(':unknown_emoji:')).toBe(':unknown_emoji:');
      expect(shortcodeToNative('unknown_emoji')).toBe('unknown_emoji');
    });

    it('handles shortcode with only leading colon', () => {
      expect(shortcodeToNative(':grinning')).toBe('😀');
    });

    it('handles shortcode with only trailing colon', () => {
      expect(shortcodeToNative('grinning:')).toBe('😀');
    });

    it('handles multiple colons correctly', () => {
      // Should strip outer colons but preserve inner ones if any
      expect(shortcodeToNative(':thumbs_up:')).toBe('👍');
    });
  });
});

