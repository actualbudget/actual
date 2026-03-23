import { LRUCache } from 'lru-cache';

const likePatternCache = new LRUCache<string, RegExp>({ max: 500 });

export function unicodeLike(
  pattern: string | null,
  value: string | null,
): number {
  if (!pattern) {
    return 0;
  }

  if (!value) {
    value = '';
  }

  let cachedRegExp = likePatternCache.get(pattern);
  if (!cachedRegExp) {
    // Process escaped special characters first (from escaped search input)
    // Unescape literal \? and \% so they are matched as regular characters
    let processedPattern = pattern
      .replace(/\\\?/g, '?')
      .replace(/\\%/g, '%');

    // Escape regex special characters (except ? and % which are our wildcards)
    processedPattern = processedPattern
      .replace(/[.*+^${}()|[\]\\]/g, '\\$&');

    // Now replace wildcards with regex equivalents
    processedPattern = processedPattern
      .replaceAll('?', '.')
      .replaceAll('%', '.*');

    cachedRegExp = new RegExp(processedPattern, 'i');
    likePatternCache.set(pattern, cachedRegExp);
  }

  return cachedRegExp.test(value) ? 1 : 0;
}
