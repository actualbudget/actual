import { createApp } from '#server/app';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { undoable } from '#server/undo';
import type { NoteEntity } from '#types/models';

export type NotesHandlers = {
  'notes-save': typeof updateNotes;
  'notes-save-undoable': typeof updateNotes;
  'notes-get': (arg: Pick<NoteEntity, 'id'>) => Promise<NoteEntity | null>;
};

export const app = createApp<NotesHandlers>();
app.method('notes-save', updateNotes);
app.method('notes-save-undoable', mutator(undoable(updateNotes)));
app.method('notes-get', getNote);

async function updateNotes({ id, note }: NoteEntity) {
  await db.update('notes', { id, note });
}

async function getNote({
  id,
}: Pick<NoteEntity, 'id'>): Promise<NoteEntity | null> {
  return db.first<NoteEntity>('SELECT id, note FROM notes WHERE id = ?', [id]);
}
