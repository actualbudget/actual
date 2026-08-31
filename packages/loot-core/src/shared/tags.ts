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
