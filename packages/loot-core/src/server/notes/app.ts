import { createApp } from '#server/app';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { undoable } from '#server/undo';
import type { NoteEntity } from '#types/models';

export type NotesHandlers = {
  'notes-save': typeof updateNotes;
  'notes-save-undoable': typeof updateNotes;
};

export const app = createApp<NotesHandlers>();
app.method('notes-save', updateNotes);
app.method('notes-save-undoable', mutator(undoable(updateNotes)));

async function updateNotes({ id, note }: NoteEntity) {
  await db.update('notes', { id, note });
}
