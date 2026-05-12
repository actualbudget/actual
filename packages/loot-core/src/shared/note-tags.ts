const NOTE_TAG_START_PATTERN = String.raw`(?<!#)#`;
const NOTE_TAG_BODY_PATTERN = String.raw`([^#\s]+)`;
const NOTE_TAG_END_PATTERN = String.raw`(?=[\s#]|$)`;

export function normalizeNoteTag(tag: string): string {
  return tag.trim().replace(/^#+/, '').replace(/\s/g, '');
}

export function getNoteTags(notes: string): string[] {
  return Array.from(createNoteTagsRegex()[Symbol.matchAll](notes), match => {
    const tag = match[1];
    if (tag === undefined) {
      throw new Error('Expected note tag match to include a tag capture group');
    }
    return tag;
  });
}

export function noteHasTag(notes: string, tag: string): boolean {
  const normalizedTag = normalizeNoteTag(tag);

  return normalizedTag ? createNoteTagRegex(normalizedTag).test(notes) : false;
}

export function createNoteTagsRegex(): RegExp {
  return new RegExp(`${NOTE_TAG_START_PATTERN}${NOTE_TAG_BODY_PATTERN}`, 'g');
}

export function createNoteTagRegex(tag: string): RegExp {
  return new RegExp(createNoteTagRegexSource(tag), 'g');
}

export function createNoteTagRegexSource(tag: string): string {
  return `${NOTE_TAG_START_PATTERN}${escapeRegExp(tag)}${NOTE_TAG_END_PATTERN}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
