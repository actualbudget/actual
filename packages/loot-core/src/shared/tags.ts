import type { ObjectExpression } from './query';

// for a given string, returns an array of unique words
// (whitespace-separated) with only a single # prepended,
// so "one #one ##one ##two three" becomes
// ["#one", "#two", "#three"]
export function extractTagsForFilter(value: string) {
  if (!value) return [];
  const tagValues = [];
  const seenTags = new Set();
  for (const [_, tag] of value.matchAll(/#*([^#\s]+)/g)) {
    const tagWithHash = '#' + tag;
    if (!seenTags.has(tagWithHash)) {
      seenTags.add(tagWithHash);
      tagValues.push(tagWithHash);
    }
  }
  return tagValues;
}

// Tags in notes are delimited by whitespace or another '#', and a doubled
// '#' escapes the tag (see `parseNotes`). Matching is case sensitive because
// tag identity elsewhere (colors, discovery) is case sensitive too.
export function renameTagInNotes(
  notes: string,
  oldTag: string,
  newTag: string,
) {
  const escaped = oldTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<!#)#${escaped}(?=[\\s#]|$)`, 'g');
  return notes.replace(pattern, () => `#${newTag}`);
}

export function extractTagsFromText(value: string): string[] {
  if (!value) return [];

  const tags: string[] = [];
  const seenTags = new Set<string>();
  for (const match of value.matchAll(/(?<!#)#([^#\s]+)/g)) {
    const tag = match[1];
    if (!seenTags.has(tag)) {
      seenTags.add(tag);
      tags.push(tag);
    }
  }

  return tags;
}

// Bank sync adds this tag to the notes of transactions it creates, while
// the `reviewNewTransactions` experimental feature is on. The tag lives
// in the notes, so it needs no column and syncs like any other edit.
export const UNREVIEWED_TAG = 'unreviewed';

function makeTagRegex(tag: string, flags?: string) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!#)#${escaped}(?=[\\s#]|$)`, flags);
}

export function hasTag(notes: string | null | undefined, tag: string) {
  return !!notes && makeTagRegex(tag).test(notes);
}

export function addTag(notes: string | null | undefined, tag: string) {
  if (hasTag(notes, tag)) {
    return notes as string;
  }
  const trimmed = notes?.trimEnd();
  return trimmed ? `${trimmed} #${tag}` : `#${tag}`;
}

// Returns null rather than an empty string when only the tag was left,
// matching how the rest of the app stores "no notes".
export function removeTag(notes: string | null | undefined, tag: string) {
  if (!notes) {
    return notes ?? null;
  }
  const cleaned = notes
    .replace(makeTagRegex(tag, 'g'), '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return cleaned === '' ? null : cleaned;
}

export function makeTagAqlRegex(tag: string): string {
  const tagWithHash = tag.startsWith('#') ? tag : `#${tag}`;
  const escapedTag = tagWithHash
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // AQL unescapes `\$`, so a character class is needed for a literal `$`.
    .replace(/\\\$/g, '[$]');

  return `(^|[^#])${escapedTag}([\\s#]|$)`;
}

export function makeExactTagSetQueryFilter(
  bucketTagNames: string[],
  scopeTagNames: string[],
): ObjectExpression {
  const bucketTags = new Set(bucketTagNames);
  const includedTagFilters = bucketTagNames.map(tag => ({
    notes: { $regexp: makeTagAqlRegex(tag) },
  }));
  const excludedTagFilters = scopeTagNames
    .filter(tag => !bucketTags.has(tag))
    .map(tag => ({
      notes: { $notregexp: makeTagAqlRegex(tag) },
    }));

  return { $and: [...includedTagFilters, ...excludedTagFilters] };
}
