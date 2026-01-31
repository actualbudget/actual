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
 * Converts an emoji shortcode (e.g., ":large_blue_circle:") to its native emoji character.
 * Only matches exact shortcode IDs - no partial matching.
 * Returns the original string if the shortcode is not found.
 *
 * @param shortcode - The emoji shortcode (with or without colons)
 * @returns The native emoji character, or the original string if not found
 */
export function shortcodeToNative(shortcode: string | null): string {
  if (!shortcode) {
    return '';
  }

  const id = shortcode.replace(/^:+|:+$/g, '');
  if (!id) {
    return shortcode;
  }

  const cache = buildEmojiCache();
  const native = cache.get(id);
  return native || shortcode; // Fallback to shortcode if not found
}

/**
 * Converts a native emoji character to its shortcode (e.g., "🔵" -> ":large_blue_circle:").
 * If the input is already a shortcode, returns it with colons.
 * Returns the original string if the emoji is not found.
 */
export function nativeToShortcode(emoji: string | null): string {
  if (!emoji) {
    return '';
  }

  const hasNonAscii = Array.from(emoji).some(
    char => (char.codePointAt(0) ?? 0) > 127,
  );
  if (emoji.includes(':') || !hasNonAscii) {
    // Already a shortcode, ensure it has colons
    const id = emoji.replace(/^:/, '').replace(/:$/, '');
    return `:${id}:`;
  }

  const cache = buildEmojiCache();
  const shortcode = cache.get(emoji);
  return shortcode ? `:${shortcode}:` : emoji;
}

/**
 * Normalizes a flag value to shortcode format (e.g., ":large_blue_circle:").
 * If the input is already a shortcode, ensures it has colons.
 * If the input is a native emoji, converts it back to shortcode.
 * Trusts that internal systems (emoji picker, exporter) use valid shortcodes.
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

  if (flag.includes(':')) {
    const id = flag.replace(/^:+|:+$/g, '');
    return id ? `:${id}:` : null;
  }

  if (/^[a-zA-Z0-9_-]+$/.test(flag)) {
    return `:${flag}:`;
  }

  const cache = buildEmojiCache();
  const shortcode = cache.get(flag);
  if (shortcode) {
    return `:${shortcode}:`;
  }

  return flag;
}

/**
 * Validates that a shortcode exists in the emoji data and returns it normalized.
 * Used during CSV import to ensure only exact shortcode matches are accepted.
 *
 * @param shortcode - The shortcode to validate (with or without colons)
 * @returns The normalized shortcode with colons if valid, null otherwise
 */
export function validateNormalizeShortcode(
  shortcode: string | null | undefined,
): string | null {
  if (!shortcode) {
    return null;
  }

  const id = shortcode.replace(/^:+|:+$/g, '');
  if (!id) {
    return null;
  }

  const cache = buildEmojiCache();
  if (cache.has(id)) {
    return `:${id}:`;
  }

  return null;
}
