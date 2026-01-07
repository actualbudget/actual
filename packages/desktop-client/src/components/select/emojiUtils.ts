import data, { type EmojiMartData } from '@emoji-mart/data';

const emojiData = data as EmojiMartData;

type EmojiMartEmoji = {
  id: string;
  name: string;
  skins?: Array<{ native?: string }>;
  keywords?: string[];
  shortcodes?: string;
};

// Cache of all emojis for quick lookup
let emojiCache: Map<string, string> | null = null;

function buildEmojiCache(): Map<string, string> {
  if (emojiCache) {
    return emojiCache;
  }

  emojiCache = new Map();
  if (emojiData && emojiData.emojis) {
    Object.values(emojiData.emojis).forEach(emoji => {
      const e = emoji as EmojiMartEmoji;
      const baseSkin = e.skins?.[0];
      if (baseSkin?.native) {
        // Map shortcode (e.g., "grinning") to native emoji
        emojiCache!.set(e.id, baseSkin.native);
      }
    });
  }
  return emojiCache;
}

/**
 * Converts an emoji shortcode (e.g., ":grinning:") to its native emoji character.
 * Returns the original string if the shortcode is not found.
 */
export function shortcodeToNative(shortcode: string | null): string {
  if (!shortcode) {
    return '';
  }

  // Remove leading and trailing colons if present
  const id = shortcode.replace(/^:/, '').replace(/:$/, '');
  const cache = buildEmojiCache();
  return cache.get(id) || shortcode; // Fallback to shortcode if not found
}
