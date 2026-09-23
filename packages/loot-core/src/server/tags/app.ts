import { createApp } from '#server/app';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { batchMessages } from '#server/sync';
import { undoable } from '#server/undo';
import { renameTagInNotes } from '#shared/tags';
import type { TagEntity } from '#types/models';

export type TagsHandlers = {
  'tags-get': typeof getTags;
  'tags-create': typeof createTag;
  'tags-delete': typeof deleteTag;
  'tags-delete-all': typeof deleteAllTags;
  'tags-hide-all': typeof hideAllTags;
  'tags-unhide-all': typeof unhideAllTags;
  'tags-update': typeof updateTag;
  'tags-rename': typeof renameTag;
  'tags-discover': typeof discoverTags;
};

export const app = createApp<TagsHandlers>();
app.method('tags-get', getTags);
app.method('tags-create', mutator(undoable(createTag)));
app.method('tags-delete', mutator(undoable(deleteTag)));
app.method('tags-delete-all', mutator(undoable(deleteAllTags)));
app.method('tags-hide-all', mutator(undoable(hideAllTags)));
app.method('tags-unhide-all', mutator(undoable(unhideAllTags)));
app.method('tags-update', mutator(undoable(updateTag)));
app.method('tags-rename', mutator(undoable(renameTag)));
app.method('tags-discover', mutator(discoverTags));

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
async function getTags(): Promise<TagEntity[]> {
  const tags = await db.getTags();
  tags.sort((a, b) => collator.compare(a.tag, b.tag));
  return tags.map(tag => ({ ...tag, hidden: !!tag.hidden }));
}

async function createTag({
  tag,
  color = null,
  description = null,
}: Omit<TagEntity, 'id'>): Promise<TagEntity> {
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

async function deleteTag(tag: Pick<TagEntity, 'id'>): Promise<TagEntity['id']> {
  await db.deleteTag(tag);
  return tag.id;
}

async function deleteAllTags(
  ids: Array<TagEntity['id']>,
): Promise<Array<TagEntity['id']>> {
  await batchMessages(async () => {
    for (const id of ids) {
      await db.deleteTag({ id });
    }
  });
  return ids;
}

async function hideAllTags(ids: Array<TagEntity['id']>) {
  await batchMessages(async () => {
    for (const id of ids) {
      await db.updateTag({ id, hidden: 1 });
    }
  });
  return ids;
}

async function unhideAllTags(ids: Array<TagEntity['id']>) {
  await batchMessages(async () => {
    for (const id of ids) {
      await db.updateTag({ id, hidden: 0 });
    }
  });
  return ids;
}

async function updateTag(
  tag: Partial<TagEntity> & Pick<TagEntity, 'id'>,
): Promise<Partial<TagEntity>> {
  const { hidden, ...rest } = tag;
  await db.updateTag({
    ...rest,
    ...(hidden !== undefined ? { hidden: hidden ? 1 : 0 } : {}),
  });
  return tag;
}

async function renameTag({
  id,
  tag: newTag,
}: Pick<TagEntity, 'id' | 'tag'>): Promise<TagEntity['id']> {
  const name = newTag.trim();
  // accept any char except whitespaces and '#', same as tag creation
  if (!/^[^#\s]+$/.test(name)) {
    throw new Error('Invalid tag name');
  }

  const tags = await db.getTags();
  const allTags = await db.getAllTags();
  const existing = tags.find(t => t.id === id);
  if (!existing) {
    throw new Error('Tag not found');
  }
  if (existing.tag === name) {
    return id;
  }
  if (allTags.some(t => t.id !== id && t.tag === name)) {
    throw new Error('A tag with that name already exists');
  }

  await batchMessages(async () => {
    await db.updateTag({ id, tag: name });

    for (const { id: transactionId, notes } of await db.findTags()) {
      const renamed = renameTagInNotes(notes, existing.tag, name);
      if (renamed !== notes) {
        await db.updateTransaction({ id: transactionId, notes: renamed });
      }
    }
  });

  return id;
}

async function discoverTags(): Promise<TagEntity[]> {
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
