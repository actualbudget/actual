import { Tag } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { undoable } from '../undo';

export type TagsHandlers = {
  'tags-get': typeof getTags;
  'tags-create': typeof createTag;
  'tags-delete': typeof deleteTag;
  'tags-update': typeof updateTag;
};

export const app = createApp<TagsHandlers>();
app.method('tags-get', getTags);
app.method('tags-create', mutator(undoable(createTag)));
app.method('tags-delete', mutator(undoable(deleteTag)));
app.method('tags-update', mutator(undoable(updateTag)));

async function getTags(): Promise<Tag[]> {
  return await db.getTags();
}

async function createTag({
  tag,
  color,
}: {
  tag: string;
  color: string;
}): Promise<Tag> {
  const id = await db.insertTag({
    tag: tag.trim(),
    color: color.trim(),
  });

  return { id, tag, color };
}

async function deleteTag(tag: Tag): Promise<Tag['id']> {
  await db.deleteTag(tag);
  return tag.id;
}

async function updateTag(tag: Tag): Promise<Tag> {
  await db.updateTag(tag);
  return tag;
}
