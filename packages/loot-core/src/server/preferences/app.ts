import { type SyncedPrefs } from '../../types/prefs';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { undoable } from '../undo';

import { PreferencesHandlers } from './types/handlers';

export const app = createApp<PreferencesHandlers>();

const savePreferences = async ({
  id,
  value,
}: {
  id: keyof SyncedPrefs;
  value: string | undefined;
}) => {
  await db.update('preferences', { id, value });
};

app.method('preferences/save', mutator(undoable(savePreferences)));
