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
