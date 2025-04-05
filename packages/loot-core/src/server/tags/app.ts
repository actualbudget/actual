import { createApp } from '../app';
import { getTransactionTags } from '../db';

export type TagsHandlers = {
  'tags-get': typeof getTags;
};

export const app = createApp<TagsHandlers>();
app.method('tags-get', getTags);

async function getTags(): Promise<Array<string>> {
  const taggedNotes = await getTransactionTags();
  return taggedNotes.map(({ tag }) => tag);
}
