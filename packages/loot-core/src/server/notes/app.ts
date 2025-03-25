import { NoteEntity } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';

export type NotesHandlers = {
  'notes-save': typeof updateNotes;
};

export const app = createApp<NotesHandlers>();
app.method('notes-save', updateNotes);

async function updateNotes({ id, note }: NoteEntity) {
  await db.update('notes', { id, note });
}
