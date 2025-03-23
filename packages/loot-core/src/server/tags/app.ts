import { createApp } from '../app';
import { getTaggedTransactionNotes } from '../db';

export type TagsHandlers = {
  'tags-get': typeof getTags;
};

export const app = createApp<TagsHandlers>();
app.method('tags-get', getTags);

async function getTags(): Promise<Array<string>> {
  const taggedNotes = await getTaggedTransactionNotes();
  const tagSet = new Set<string>();
  const tagArr: string[] = [];
  for (const taggedNote of taggedNotes) {
    const note = taggedNote?.notes;
    if (!note) continue;
    for (let i = note.indexOf('#'); i !== -1; i = note.indexOf('#', i + 1)) {
      // TODO: make this handle other whitespace chars
      const tagEnd = note.indexOf(' ', i);
      const tag = note.slice(i, tagEnd === -1 ? note.length : tagEnd);
      if (!tagSet.has(tag)) {
        tagArr.push(tag);
        tagSet.add(tag);
      }
    }
  }
  return tagArr;
}
