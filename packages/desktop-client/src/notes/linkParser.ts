export type ParsedSegment =
  | { type: 'text'; content: string }
  | { type: 'tag'; content: string; tag: string }
  | {
      type: 'link';
      content: string;
      displayText: string;
      url: string;
      isFilePath: boolean;
    };

// Regex patterns for link detection
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/;
const FULL_URL_REGEX = /https?:\/\/[^\s]+/;
const WWW_URL_REGEX = /www\.[^\s]+/;
const UNIX_PATH_REGEX = /^\/[^\s/]+\/[^\s]*$/;
const WINDOWS_PATH_REGEX = /^[A-Z]:\\(?:[^\s\\]+\\)*[^\s\\]+$/i;

// Common trailing punctuation that should not be part of URLs
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?)\]"']+$/;

/**
 * Strips trailing punctuation from a URL
 */
function stripTrailingPunctuation(url: string): string {
  return url.replace(TRAILING_PUNCTUATION_REGEX, '');
}

/**
 * Checks if a URL is a file path
 */
export function isFilePathUrl(url: string): boolean {
  return (
    url.startsWith('/') || /^[A-Z]:\\/i.test(url) || url.startsWith('file://')
  );
}

/**
 * Normalizes a URL by adding protocol if missing
 */
export function normalizeUrl(rawUrl: string): string {
  // Already has protocol
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }

  // www. URL - add https://
  if (rawUrl.startsWith('www.')) {
    return `https://${rawUrl}`;
  }

  // File path - convert to file:// URL
  if (rawUrl.startsWith('/') || /^[A-Z]:\\/i.test(rawUrl)) {
    return `file://${rawUrl}`;
  }

  return rawUrl;
}

/**
 * Parses a single word for hashtags (existing logic from NotesTagFormatter)
 * Returns segments for tags found in the word
 */
function parseTagsInWord(word: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];

  if (!word.includes('#') || word.length <= 1) {
    return [{ type: 'text', content: word }];
  }

  let lastEmptyTag = -1;
  const parts = word.split('#');

  parts.forEach((tag, ti) => {
    if (ti === 0) {
      if (tag) {
        segments.push({ type: 'text', content: tag });
      }
      return;
    }

    if (!tag) {
      lastEmptyTag = ti;
      segments.push({ type: 'text', content: '#' });
      return;
    }

    if (lastEmptyTag === ti - 1) {
      segments.push({ type: 'text', content: `${tag}` });
      return;
    }
    lastEmptyTag = -1;

    const validTag = `#${tag}`;
    segments.push({ type: 'tag', content: validTag, tag });
  });

  return segments;
}

/**
 * Parses notes string into segments of text, tags, and links
 */
export function parseNotes(notes: string): ParsedSegment[] {
  if (!notes) {
    return [];
  }

  const segments: ParsedSegment[] = [];
  let remaining = notes;

  while (remaining.length > 0) {
    // Check for markdown link first (highest priority)
    const markdownMatch = remaining.match(MARKDOWN_LINK_REGEX);
    if (markdownMatch && markdownMatch.index !== undefined) {
      // Add text before the link
      if (markdownMatch.index > 0) {
        const textBefore = remaining.slice(0, markdownMatch.index);
        segments.push(...parseTextWithTags(textBefore));
      }

      // Add the link segment
      const [fullMatch, displayText, url] = markdownMatch;
      const isFilePath =
        url.startsWith('/') ||
        /^[A-Z]:\\/i.test(url) ||
        url.startsWith('file://');
      segments.push({
        type: 'link',
        content: fullMatch,
        displayText,
        url,
        isFilePath,
      });

      remaining = remaining.slice(markdownMatch.index + fullMatch.length);
      continue;
    }

    // Check for plain URLs (http://, https://)
    const urlMatch = remaining.match(FULL_URL_REGEX);
    if (urlMatch && urlMatch.index !== undefined) {
      // Add text before the URL
      if (urlMatch.index > 0) {
        const textBefore = remaining.slice(0, urlMatch.index);
        segments.push(...parseTextWithTags(textBefore));
      }

      // Strip trailing punctuation from the URL
      const rawUrl = urlMatch[0];
      const url = stripTrailingPunctuation(rawUrl);

      // Add the link segment
      segments.push({
        type: 'link',
        content: url,
        displayText: url,
        url,
        isFilePath: false,
      });

      remaining = remaining.slice(urlMatch.index + url.length);
      continue;
    }

    // Check for www. URLs
    const wwwMatch = remaining.match(WWW_URL_REGEX);
    if (wwwMatch && wwwMatch.index !== undefined) {
      // Add text before the URL
      if (wwwMatch.index > 0) {
        const textBefore = remaining.slice(0, wwwMatch.index);
        segments.push(...parseTextWithTags(textBefore));
      }

      // Strip trailing punctuation from the URL
      const rawUrl = wwwMatch[0];
      const url = stripTrailingPunctuation(rawUrl);

      // Add the link segment
      segments.push({
        type: 'link',
        content: url,
        displayText: url,
        url,
        isFilePath: false,
      });

      remaining = remaining.slice(wwwMatch.index + url.length);
      continue;
    }

    // No more links found, parse remaining text with tags
    segments.push(...parseTextWithTags(remaining));
    break;
  }

  return segments;
}

/**
 * Parses text that may contain hashtags and file paths
 */
function parseTextWithTags(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const words = text.split(/(\s+)/); // Split but keep whitespace

  for (const word of words) {
    // Check if it's whitespace
    if (/^\s+$/.test(word)) {
      segments.push({ type: 'text', content: word });
      continue;
    }

    // Check if it's a file path
    if (UNIX_PATH_REGEX.test(word) || WINDOWS_PATH_REGEX.test(word)) {
      segments.push({
        type: 'link',
        content: word,
        displayText: word,
        url: word,
        isFilePath: true,
      });
      continue;
    }

    // Check for hashtags
    if (word.includes('#') && word.length > 1) {
      segments.push(...parseTagsInWord(word));
      continue;
    }

    // Plain text
    if (word) {
      segments.push({ type: 'text', content: word });
    }
  }

  return segments;
}
