import { NoteEntity } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { undoable } from '../undo';

import { NotesHandlers } from './types/handlers';

export const app = createApp<NotesHandlers>();

async function updateNotes({ id, note }: NoteEntity) {
  await db.update('notes', { id, note });
}

app.method('notes-save', mutator(undoable(updateNotes)));
