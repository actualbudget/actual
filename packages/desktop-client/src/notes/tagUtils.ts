export function normalizeNoteTag(tag: string): string {
  return tag.trim().replace(/^#+/, '').replace(/\s/g, '');
}

export function addTagToNotes(
  notes: string | null | undefined,
  tag: string,
): string {
  const normalizedTag = normalizeNoteTag(tag);
  const currentNotes = notes?.trim() ?? '';

  if (!normalizedTag) {
    return currentNotes;
  }

  if (hasTag(currentNotes, normalizedTag)) {
    return currentNotes;
  }

  return `${currentNotes} #${normalizedTag}`.trim();
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
    .replace(tagRegex(normalizedTag), (_match, prefix: string) => prefix || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasTag(notes: string, tag: string): boolean {
  return tagRegex(tag).test(notes);
}

function tagRegex(tag: string): RegExp {
  return new RegExp(`(^|\\s)#${escapeRegExp(tag)}(?=\\s|$)`, 'g');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
