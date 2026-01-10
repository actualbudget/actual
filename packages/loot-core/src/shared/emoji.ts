// @ts-strict-ignore
import data, { type EmojiMartData } from '@emoji-mart/data';

const emojiData = data as EmojiMartData;

type EmojiMartEmoji = {
  id: string;
  name: string;
  skins?: Array<{ native?: string }>;
  keywords?: string[];
  shortcodes?: string;
};

let emojiCache: Map<string, string> | null = null;

function buildEmojiCache(): Map<string, string> {
  if (emojiCache) {
    return emojiCache;
  }

  emojiCache = new Map<string, string>();

  if (emojiData && emojiData.emojis) {
    Object.values(emojiData.emojis).forEach(emoji => {
      const e = emoji as EmojiMartEmoji;
      const baseSkin = e.skins?.[0];
      if (baseSkin?.native) {
        // Store both directions in the same map, shortcode -> native and native -> shortcode
        emojiCache!.set(e.id, baseSkin.native);
        emojiCache!.set(baseSkin.native, e.id);
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

  const id = shortcode.replace(/^:/, '').replace(/:$/, '');
  const cache = buildEmojiCache();
  return cache.get(id) || shortcode; // Fallback to shortcode if not found
}

/**
 * Converts a native emoji character to its shortcode (e.g., "😀" -> ":grinning:").
 * If the input is already a shortcode, returns it with colons.
 * Returns the original string if the emoji is not found.
 */
export function nativeToShortcode(emoji: string | null): string {
  if (!emoji) {
    return '';
  }

  // Check if it's already a shortcode (contains colons or doesn't look like emoji)
  if (emoji.includes(':') || !/[^\x00-\x7F]/.test(emoji)) {
    // Already a shortcode, ensure it has colons
    const id = emoji.replace(/^:/, '').replace(/:$/, '');
    return `:${id}:`;
  }

  const cache = buildEmojiCache();
  const shortcode = cache.get(emoji);
  return shortcode ? `:${shortcode}:` : emoji;
}

/**
 * Normalizes a flag value to shortcode format (e.g., ":grinning:").
 * If the input is already a shortcode, ensures it has colons.
 * If the input is a native emoji, converts it back to shortcode.
 *
 * @param flag - The flag value (shortcode or native emoji)
 * @returns The flag in shortcode format with colons, or null if empty
 */
export function normalizeFlagToShortcode(
  flag: string | null | undefined,
): string | null {
  if (!flag) {
    return null;
  }

  // If it already looks like a shortcode (contains colons), ensure it has proper format
  if (flag.includes(':')) {
    // Remove existing colons and add them back
    const id = flag.replace(/^:/, '').replace(/:$/, '');
    return id ? `:${id}:` : null;
  }

  // If it's alphanumeric with underscores/dashes (likely a shortcode without colons)
  if (/^[a-zA-Z0-9_-]+$/.test(flag)) {
    return `:${flag}:`;
  }

  // If it's a unicode emoji, try to convert it back to shortcode
  const cache = buildEmojiCache();
  const shortcode = cache.get(flag);
  if (shortcode) {
    return `:${shortcode}:`;
  }

  // If we can't convert it, return as-is (shouldn't happen if database stores shortcodes)
  return flag;
}
