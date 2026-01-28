import type { NoteEntity } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { undoable } from '../undo';

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
