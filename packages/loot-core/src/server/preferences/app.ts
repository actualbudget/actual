import { createApp } from '../app';
import * as db from '../db';

import { PreferencesHandlers } from './types/handlers';

export const app = createApp<PreferencesHandlers>();

app.method('preferences-save', async ({ id, value }) => {
  await db.update('preferences', { id, value });
});
