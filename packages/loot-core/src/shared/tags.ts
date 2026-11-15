import type { TransactionEntity } from '#types/models';

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

function makeTagRegex(tag: string, flags?: string) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!#)#${escaped}(?=[\\s#]|$)`, flags);
}

// Tags in notes are delimited by whitespace or another '#', and a doubled
// '#' escapes the tag (see `parseNotes`). Matching is case sensitive because
// tag identity elsewhere (colors, discovery) is case sensitive too.
export function renameTagInNotes(
  notes: string,
  oldTag: string,
  newTag: string,
) {
  return notes.replace(makeTagRegex(oldTag, 'g'), () => `#${newTag}`);
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

export function hasTag(notes: string | null | undefined, tag: string) {
  return !!notes && makeTagRegex(tag).test(notes);
}

export function addTag(notes: string | null | undefined, tag: string) {
  if (notes && hasTag(notes, tag)) {
    return notes;
  }
  const trimmed = notes?.trimEnd();
  return trimmed ? `${trimmed} #${tag}` : `#${tag}`;
}

// Removes the tag and the spaces or tabs next to it, keeping one separator
// only where the tag sat between other text. The rest of the notes is left
// as-is, so this undoes `addTag`. Returns an empty string when nothing
// but whitespace was left, matching what the notes field saves when it is
// cleared.
export function removeTag(notes: string | null | undefined, tag: string) {
  if (!notes) {
    return '';
  }
  const pattern = new RegExp(
    `([ \\t]*)${makeTagRegex(tag).source}([ \\t]*)`,
    'g',
  );
  const cleaned = notes.replace(
    pattern,
    (match: string, before: string, after: string, offset: number) => {
      const next = notes[offset + match.length];
      const isBetweenText = after !== '' || next === '#';
      if (!isBetweenText) {
        return '';
      }
      if (before !== '') {
        return before;
      }
      // The tag was written right after other text (`receipt#tag more`),
      // so the space after it is the only separator left.
      return offset > 0 ? after : '';
    },
  );
  return cleaned.trim() === '' ? '' : cleaned;
}

export function isUnreviewed(notes: string | null | undefined) {
  return hasTag(notes, UNREVIEWED_TAG);
}

// Adds or removes the unreviewed tag so the notes match `reviewed`.
export function setReviewed(
  notes: string | null | undefined,
  reviewed: boolean,
) {
  return reviewed
    ? removeTag(notes, UNREVIEWED_TAG)
    : addTag(notes, UNREVIEWED_TAG);
}

// Someone who sets a transaction's category has looked at it, so it no
// longer needs review. Only call this for edits a person makes: categories
// set by rules or bank sync must leave the tag alone. The tag lives on a
// split's parent, so a child's category doesn't count. Moving a
// transaction to an off-budget account clears its category, so that marks
// it reviewed too: choosing to take it off-budget is a review decision.
export function markReviewedOnCategoryChange<
  T extends Pick<TransactionEntity, 'category' | 'notes' | 'is_child'>,
>(previous: Pick<TransactionEntity, 'category'> | undefined, next: T): T {
  if (
    !previous ||
    next.is_child ||
    previous.category === next.category ||
    !isUnreviewed(next.notes)
  ) {
    return next;
  }
  return { ...next, notes: setReviewed(next.notes, true) };
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
