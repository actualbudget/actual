import { TagColor } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { undoable } from '../undo';

export type TagsHandlers = {
  'tags-colors-get': typeof getTagsColors;
  'tags-colors-create': typeof createTagColor;
  'tags-colors-delete': typeof deleteTagColor;
  'tags-colors-update': typeof updateTagColor;
};

export const app = createApp<TagsHandlers>();
app.method('tags-colors-get', getTagsColors);
app.method('tags-colors-create', mutator(undoable(createTagColor)));
app.method('tags-colors-delete', mutator(undoable(deleteTagColor)));
app.method('tags-colors-update', mutator(undoable(updateTagColor)));

async function getTagsColors(): Promise<TagColor[]> {
  return await db.getTagsColors();
}

async function createTagColor({
  tag,
  color,
}: {
  tag: string;
  color: string;
}): Promise<TagColor> {
  const id = await db.insertTagColor({
    tag: tag.trim(),
    color: color.trim(),
  });

  return { id, tag, color };
}

async function deleteTagColor(tag: TagColor): Promise<TagColor['id']> {
  await db.deleteTagColor(tag);
  return tag.id;
}

async function updateTagColor(tag: TagColor): Promise<TagColor> {
  await db.updateTagColor(tag);
  return tag;
}
