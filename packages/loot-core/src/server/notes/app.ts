import { createApp } from '../app';
import * as db from '../db';

let app = createApp();

app.method('notes-save', async ({ id, note }) => {
  await db.update('notes', { id, note });
});

export default app;
