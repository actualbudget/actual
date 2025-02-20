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
    // we don't escape ? and % because we don't know
    // whether they originate from the user input or from our query compiler.
    // Maybe improve the query compiler to correctly process these characters?
    const processedPattern = pattern
      .replace(/[.*+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('?', '.')
      .replaceAll('%', '.*');
    cachedRegExp = new RegExp(processedPattern, 'i');
    likePatternCache.set(pattern, cachedRegExp);
  }

  return cachedRegExp.test(value) ? 1 : 0;
}
