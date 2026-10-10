export type TagSegment = Extract<ParsedSegment, { type: 'tag' }>;

export type ParsedSegment =
  | { type: 'text'; content: string }
  | {
      type: 'tag';
      content: string;
      tag: string;
      /** Offset of the tag's `#` in the original notes string. */
      start: number;
      /** Offset just past the tag's last character in the original notes. */
      end: number;
    }
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
function parseTagsInWord(word: string, baseOffset: number): ParsedSegment[] {
  const segments: ParsedSegment[] = [];

  if (!word.includes('#') || word.length <= 1) {
    return [{ type: 'text', content: word }];
  }

  let lastEmptyTag = -1;
  const parts = word.split('#');
  // Offset (in the original notes) of the current part, i.e. just past the
  // `#` that precedes it.
  let partOffset = baseOffset;

  parts.forEach((tag, ti) => {
    const tagOffset = partOffset;
    partOffset += tag.length + 1;

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
    segments.push({
      type: 'tag',
      content: validTag,
      tag,
      start: tagOffset - 1,
      end: tagOffset + tag.length,
    });
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
  // Offset of `remaining` within `notes`, so tags can report where they sit
  // in the original string.
  let offset = 0;

  while (remaining.length > 0) {
    // Check for markdown link first (highest priority)
    const markdownMatch = remaining.match(MARKDOWN_LINK_REGEX);
    if (markdownMatch && markdownMatch.index !== undefined) {
      // Add text before the link
      if (markdownMatch.index > 0) {
        const textBefore = remaining.slice(0, markdownMatch.index);
        segments.push(...parseTextWithTags(textBefore, offset));
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

      const consumed = markdownMatch.index + fullMatch.length;
      remaining = remaining.slice(consumed);
      offset += consumed;
      continue;
    }

    // Check for plain URLs (http://, https://)
    const urlMatch = remaining.match(FULL_URL_REGEX);
    if (urlMatch && urlMatch.index !== undefined) {
      // Add text before the URL
      if (urlMatch.index > 0) {
        const textBefore = remaining.slice(0, urlMatch.index);
        segments.push(...parseTextWithTags(textBefore, offset));
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

      const consumed = urlMatch.index + url.length;
      remaining = remaining.slice(consumed);
      offset += consumed;
      continue;
    }

    // Check for www. URLs
    const wwwMatch = remaining.match(WWW_URL_REGEX);
    if (wwwMatch && wwwMatch.index !== undefined) {
      // Add text before the URL
      if (wwwMatch.index > 0) {
        const textBefore = remaining.slice(0, wwwMatch.index);
        segments.push(...parseTextWithTags(textBefore, offset));
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

      const consumed = wwwMatch.index + url.length;
      remaining = remaining.slice(consumed);
      offset += consumed;
      continue;
    }

    // No more links found, parse remaining text with tags
    segments.push(...parseTextWithTags(remaining, offset));
    break;
  }

  return segments;
}

/**
 * Parses text that may contain hashtags and file paths
 */
function parseTextWithTags(text: string, baseOffset: number): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const words = text.split(/(\s+)/); // Split but keep whitespace
  let nextOffset = baseOffset;

  for (const word of words) {
    const wordOffset = nextOffset;
    nextOffset += word.length;

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
      segments.push(...parseTagsInWord(word, wordOffset));
      continue;
    }

    // Plain text
    if (word) {
      segments.push({ type: 'text', content: word });
    }
  }

  return segments;
}

/**
 * Removes a single tag occurrence from notes.
 *
 * Works on the tag's offsets in the original string rather than re-joining
 * parsed segments, because segments don't round-trip (e.g. `##foo` loses a
 * `#`). The whitespace left behind is tidied so removing a tag doesn't leave a
 * double space or leading/trailing whitespace. Line breaks are kept, so the
 * text on either side of the tag stays on its own line.
 */
export function removeTagFromNotes(
  notes: string,
  segment: Pick<TagSegment, 'content' | 'start' | 'end'>,
): string {
  // Guard against a segment parsed from a different (stale) notes string.
  if (notes.slice(segment.start, segment.end) !== segment.content) {
    return notes;
  }

  let before = notes.slice(0, segment.start);
  let after = notes.slice(segment.end);

  if (before === '' || /\s$/.test(before)) {
    // Spaces and tabs only: a line break after the tag still separates lines.
    after = after.replace(/^[^\S\r\n]+/, '');
    if (/^[\r\n]/.test(after)) {
      before = before.replace(/[^\S\r\n]+$/, '');
    }
  }

  return (before + after).trim();
}
