import { LRUCache } from 'lru-cache';

const likePatternCache = new LRUCache<string, RegExp>({ max: 500 });

const REGEX_SPECIAL = /[.*+^${}()|[\]\\?]/g;

function likePatternToRegex(pattern: string): RegExp {
  let regexStr = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      if (next === '%' || next === '?' || next === '\\') {
        // escaped wildcard — treat as literal character
        regexStr += next.replace(REGEX_SPECIAL, '\\$&'); // ? added here
        i += 2;
        continue;
      }
    }
    if (ch === '%') {
      regexStr += '.*';
    } else if (ch === '?') {
      regexStr += '.';
    } else {
      regexStr += ch.replace(REGEX_SPECIAL, '\\$&');
    }
    i++;
  }
  return new RegExp(regexStr, 'i');
}

export function unicodeLike(
  pattern: string | null,
  value: string | null,
): number {
  if (!pattern) return 0;
  if (!value) value = '';

  let cachedRegExp = likePatternCache.get(pattern);
  if (!cachedRegExp) {
    cachedRegExp = likePatternToRegex(pattern);
    likePatternCache.set(pattern, cachedRegExp);
  }

  return cachedRegExp.test(value) ? 1 : 0;
}
