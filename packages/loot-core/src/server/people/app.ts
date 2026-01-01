import { type TagEntity } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { batchMessages } from '../sync';
import { undoable } from '../undo';

export type PeopleHandlers = {
  'people-get': typeof getPeople;
  'people-create': typeof createPerson;
  'people-delete': typeof deletePerson;
  'people-delete-all': typeof deleteAllPeople;
  'people-update': typeof updatePerson;
  'people-find': typeof findPeople;
};

export const app = createApp<PeopleHandlers>();
app.method('people-get', getPeople);
app.method('people-create', mutator(undoable(createPerson)));
app.method('people-delete', mutator(undoable(deletePerson)));
app.method('people-delete-all', mutator(deleteAllPeople));
app.method('people-update', mutator(undoable(updatePerson)));
app.method('people-find', mutator(findPeople));

async function getPeople(): Promise<TagEntity[]> {
  return await db.getPeople();
}

async function createPerson({
  tag,
  color = null,
  description = null,
}: Omit<TagEntity, 'id' | 'type'>): Promise<TagEntity> {
  // Preserve original case but trim whitespace
  const normalizedTag = tag.trim();

  const allPeople = await db.getAllPeople();

  // Case-insensitive check for existing person
  const existingPerson = allPeople.find(
    p => p.tag.toLowerCase() === normalizedTag.toLowerCase(),
  );
  if (existingPerson) {
    await db.updateTag({
      id: existingPerson.id,
      tag: normalizedTag, // Update with the new casing if provided
      color,
      description,
      tombstone: 0,
    });
    return {
      id: existingPerson.id,
      tag: normalizedTag,
      type: 'PERSON',
      color,
      description,
    };
  }

  const id = await db.insertTag({
    tag: normalizedTag,
    type: 'PERSON',
    color: color ? color.trim() : null,
    description,
  });

  return { id, tag: normalizedTag, type: 'PERSON', color, description };
}

async function deletePerson(person: TagEntity): Promise<TagEntity['id']> {
  await db.deleteTag(person);
  return person.id;
}

async function deleteAllPeople(
  ids: Array<TagEntity['id']>,
): Promise<Array<TagEntity['id']>> {
  await batchMessages(async () => {
    for (const id of ids) {
      await db.deleteTag({ id });
    }
  });
  return ids;
}

async function updatePerson(person: TagEntity): Promise<TagEntity> {
  await db.updateTag(person);
  return person;
}

async function findPeople(): Promise<TagEntity[]> {
  const peopleNotes = await db.findPeople();

  const people = await getPeople();
  for (const { notes } of peopleNotes) {
    // Match @person patterns (similar to #tag but for @)
    for (const [, person] of notes.matchAll(/(?<!@)@([^@\s]+)/g)) {
      // Case-insensitive check, but preserve original case when creating
      if (!people.find(p => p.tag.toLowerCase() === person.toLowerCase())) {
        people.push(await createPerson({ tag: person }));
      }
    }
  }

  // Case-insensitive sort
  return people.sort(function (a, b) {
    const aLower = a.tag.toLowerCase();
    const bLower = b.tag.toLowerCase();
    if (aLower < bLower) {
      return -1;
    }
    if (aLower > bLower) {
      return 1;
    }
    return 0;
  });
}
