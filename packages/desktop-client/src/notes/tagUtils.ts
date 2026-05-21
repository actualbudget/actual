import {
  createNoteTagRegexGlobal,
  createNoteTagsRegex,
  normalizeNoteTag,
  noteHasTag,
} from '@actual-app/core/shared/note-tags';

export { normalizeNoteTag };

/**
 * Adds one note tag to transaction notes if it is not already present.
 *
 * Existing note text is preserved and empty user input leaves the notes
 * unchanged.
 */
export function addTagToNotes(
  notes: string | null | undefined,
  tag: string,
): string {
  const normalizedTag = normalizeNoteTag(tag);
  const currentNotes = notes?.trim() ?? '';

  if (!normalizedTag) {
    return currentNotes;
  }

  if (noteHasTag(currentNotes, normalizedTag)) {
    return currentNotes;
  }

  return `${currentNotes} #${normalizedTag}`.trim();
}

/**
 * Adds multiple note tags to transaction notes.
 */
export function addTagsToNotes(
  notes: string | null | undefined,
  tags: string[],
): string {
  return tags.reduce(addTagToNotes, notes?.trim() ?? '');
}

/**
 * Removes one exact note tag from transaction notes.
 *
 * Inline tags are removed without matching partial tags, so removing `car`
 * leaves `#cart` untouched.
 */
export function removeTagFromNotes(
  notes: string | null | undefined,
  tag: string,
): string {
  const normalizedTag = normalizeNoteTag(tag);
  const currentNotes = notes?.trim() ?? '';

  if (!normalizedTag || !currentNotes) {
    return currentNotes;
  }

  return currentNotes
    .replace(createNoteTagRegexGlobal(normalizedTag), '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Removes multiple exact note tags from transaction notes.
 */
export function removeTagsFromNotes(
  notes: string | null | undefined,
  tags: string[],
): string {
  return tags.reduce(removeTagFromNotes, notes?.trim() ?? '');
}

/**
 * Removes every hashtag-style note tag from transaction notes.
 */
export function removeAllTagsFromNotes(
  notes: string | null | undefined,
): string {
  return (notes?.trim() ?? '')
    .replace(createNoteTagsRegex(), '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Adds or removes a normalized tag from the current modal selection.
 */
export function toggleSelectedNoteTag(tags: string[], tag: string): string[] {
  const normalizedTag = normalizeNoteTag(tag);

  if (!normalizedTag) {
    return tags;
  }

  if (tags.includes(normalizedTag)) {
    return tags.filter(currentTag => currentTag !== normalizedTag);
  }

  return [...tags, normalizedTag];
}

/**
 * Filters existing note tags by normalized user input.
 */
export function filterExistingNoteTags(
  tags: string[],
  query: string,
): string[] {
  const normalizedQuery = normalizeNoteTag(query).toLowerCase();

  if (!normalizedQuery) {
    return tags;
  }

  return tags.filter(tag => tag.toLowerCase().includes(normalizedQuery));
}
