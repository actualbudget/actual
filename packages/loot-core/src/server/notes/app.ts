import { createApp } from '../app';
import * as db from '../db';

import { NotesHandlers } from './types/handlers';

export const app = createApp<NotesHandlers>();

app.method('notes-save', async ({ id, note }) => {
  await db.update('notes', { id, note });
});
