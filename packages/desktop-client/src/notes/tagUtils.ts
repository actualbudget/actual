import {
  createNoteTagRegexGlobal,
  createNoteTagsRegex,
  normalizeNoteTag,
  noteHasTag,
} from '@actual-app/core/shared/note-tags';

export { normalizeNoteTag };

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

export function addTagsToNotes(
  notes: string | null | undefined,
  tags: string[],
): string {
  return tags.reduce(addTagToNotes, notes?.trim() ?? '');
}

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

export function removeTagsFromNotes(
  notes: string | null | undefined,
  tags: string[],
): string {
  return tags.reduce(removeTagFromNotes, notes?.trim() ?? '');
}

export function removeAllTagsFromNotes(
  notes: string | null | undefined,
): string {
  return (notes?.trim() ?? '')
    .replace(createNoteTagsRegex(), '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
