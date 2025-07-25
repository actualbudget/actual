import { Tag } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { batchMessages } from '../sync';
import { undoable } from '../undo';

export type TagsHandlers = {
  'tags-get': typeof getTags;
  'tags-create': typeof createTag;
  'tags-delete': typeof deleteTag;
  'tags-delete-all': typeof deleteAllTags;
  'tags-update': typeof updateTag;
  'tags-find': typeof findTags;
};

export const app = createApp<TagsHandlers>();
app.method('tags-get', getTags);
app.method('tags-create', mutator(undoable(createTag)));
app.method('tags-delete', mutator(undoable(deleteTag)));
app.method('tags-delete-all', mutator(deleteAllTags));
app.method('tags-update', mutator(undoable(updateTag)));
app.method('tags-find', mutator(findTags));

async function getTags(): Promise<Tag[]> {
  return await db.getTags();
}

async function createTag({
  tag,
  color = null,
  description = null,
}: Omit<Tag, 'id'>): Promise<Tag> {
  const allTags = await db.getAllTags();

  const { id: tagId = null } = allTags.find(t => t.tag === tag) || {};
  if (tagId) {
    await db.updateTag({
      id: tagId,
      tag,
      color,
      description,
      tombstone: 0,
    });
    return { id: tagId, tag, color, description };
  }

  const id = await db.insertTag({
    tag: tag.trim(),
    color: color ? color.trim() : null,
    description,
  });

  return { id, tag, color, description };
}

async function deleteTag(tag: Tag): Promise<Tag['id']> {
  await db.deleteTag(tag);
  return tag.id;
}

async function deleteAllTags(ids: Array<Tag['id']>): Promise<Array<Tag['id']>> {
  await batchMessages(async () => {
    for (const id of ids) {
      await db.deleteTag({ id });
    }
  });
  return ids;
}

async function updateTag(tag: Tag): Promise<Tag> {
  await db.updateTag(tag);
  return tag;
}

async function findTags(): Promise<Tag[]> {
  const taggedNotes = await db.findTags();

  const tags = await getTags();
  for (const { notes } of taggedNotes) {
    for (const [_, tag] of notes.matchAll(/(?<!#)#([^#\s]+)/g)) {
      if (!tags.find(t => t.tag === tag)) {
        tags.push(await createTag({ tag }));
      }
    }
  }

  return tags.sort(function (a, b) {
    if (a.tag < b.tag) {
      return -1;
    }
    if (a.tag > b.tag) {
      return 1;
    }
    return 0;
  });
}
