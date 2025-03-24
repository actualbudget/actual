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
    Array.from(note.matchAll(/(#[^\s]+)\s/g)).forEach(matchArr => {
      const [_, tag] = matchArr;
      if (!tagSet.has(tag)) {
        tagSet.add(tag);
        tagArr.push(tag);
      }
    });
  }
  return tagArr;
}
