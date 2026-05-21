const NOTE_TAG_START_PATTERN = String.raw`(?<!#)#`;
const NOTE_TAG_BODY_PATTERN = String.raw`([^#\s]+)`;
const NOTE_TAG_END_PATTERN = String.raw`(?=[\s#]|$)`;

/**
 * Normalizes user-entered note tag text for storage and comparisons.
 *
 * Leading hash characters and whitespace are removed so values can be compared
 * against the raw tag text stored in transaction notes.
 */
export function normalizeNoteTag(tag: string): string {
  return tag.trim().replace(/^#+/, '').replace(/\s/g, '');
}

/**
 * Extracts hashtag-style tags from a transaction note.
 *
 * Tags may appear inline, but repeated hash prefixes like `##travel` are not
 * treated as tags.
 */
export function getNoteTags(notes: string): string[] {
  return Array.from(createNoteTagsRegex()[Symbol.matchAll](notes), match => {
    const tag = match[1];
    if (tag === undefined) {
      throw new Error('Expected note tag match to include a tag capture group');
    }
    return tag;
  });
}

/**
 * Checks whether transaction notes contain an exact note tag.
 *
 * The match is boundary-aware so tags like `#car` do not match `#cart`.
 */
export function noteHasTag(notes: string, tag: string): boolean {
  const normalizedTag = normalizeNoteTag(tag);

  return normalizedTag ? createNoteTagRegex(normalizedTag).test(notes) : false;
}

/**
 * Creates a global regex for finding note tags in transaction notes.
 */
export function createNoteTagsRegex(): RegExp {
  return new RegExp(`${NOTE_TAG_START_PATTERN}${NOTE_TAG_BODY_PATTERN}`, 'g');
}

/**
 * Creates a regex that matches one exact note tag.
 */
export function createNoteTagRegex(tag: string): RegExp {
  return new RegExp(createNoteTagRegexSource(tag));
}

/**
 * Creates a global regex that matches one exact note tag.
 */
export function createNoteTagRegexGlobal(tag: string): RegExp {
  return new RegExp(createNoteTagRegexSource(tag), 'g');
}

/**
 * Creates the shared regex source for matching one exact note tag.
 */
export function createNoteTagRegexSource(tag: string): string {
  return `${NOTE_TAG_START_PATTERN}${escapeRegExp(tag)}${NOTE_TAG_END_PATTERN}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
